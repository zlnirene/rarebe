<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function verifyRecaptcha(?string $token): bool
    {
        if (!$token) return false;

        $secret = env('RECAPTCHA_SECRET_KEY');
        if (!$secret) return true; // bypass if key not set

        $response = @file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret={$secret}&response={$token}");
        $result = json_decode($response, true);
        return isset($result['success']) && $result['success'] === true;
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email'          => ['required', 'email'],
            'password'       => ['required', 'string'],
            'captcha_token'  => ['nullable', 'string'],
        ]);

        // ✅ reCAPTCHA verification
        if (!$this->verifyRecaptcha($data['captcha_token'] ?? null)) {
            return response()->json(['message' => 'Captcha verification failed.'], 422);
        }

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)
            ->where('role', 'customer')
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password) || !$user->is_active) {
            return response()->json(['message' => 'Invalid credentials or account inactive.'], 401);
        }

        // Generate OTP (unchanged)
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        Mail::html(
            $this->buildOtpEmailHtml($otp, 'Please verify your identity'),
            function ($message) use ($user) {
                $message->to($user->email)->subject('Your OTP Code');
            }
        );

        return response()->json([
            'message' => 'OTP sent to email. Verify to obtain access token.',
            'otp_expires_at' => $user->otp_expires_at,
            'user' => [
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ], 200);
    }

    public function adminLogin(Request $request)
    {
        $data = $request->validate([
            'email'          => ['required', 'email'],
            'password'       => ['required', 'string'],
            'captcha_token'  => ['nullable', 'string'],
        ]);

        // ✅ reCAPTCHA verification for admin login too
        if (!$this->verifyRecaptcha($data['captcha_token'] ?? null)) {
            return response()->json(['message' => 'Captcha verification failed.'], 422);
        }

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)
            ->whereIn('role', ['admin', 'superadmin'])
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password) || !$user->is_active) {
            return response()->json(['message' => 'Invalid credentials or account inactive.'], 401);
        }

        // Generate OTP (unchanged)
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        Mail::html(
            $this->buildOtpEmailHtml($otp, 'Please verify your identity'),
            function ($message) use ($user) {
                $message->to($user->email)->subject('Your Admin OTP Code');
            }
        );

        return response()->json([
            'message' => 'OTP sent to admin email. Verify to obtain access token.',
            'otp_expires_at' => $user->otp_expires_at,
            'user' => [
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ], 200);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s]+$/u'], // letters and spaces only
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ], [
            'name.regex' => 'Nama harus angka',
        ]);

        $normalizedEmail = strtolower(trim($data['email']));
        // Create customer user
        $user = new User();
        $user->name = $data['name'];
        $user->email = $normalizedEmail;
        $user->password = Hash::make($data['password']);
        $user->role = 'customer';
        $user->is_active = true;
        $user->save();

        // Generate OTP (6 digits) with 10-minute expiry
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        // Send OTP to email
        Mail::html(
            $this->buildOtpEmailHtml($otp, 'Please verify your identity'),
            function ($message) use ($user) {
                $message->to($user->email)->subject('Your OTP Code');
            }
        );

        return response()->json([
            'message' => 'Registration successful. OTP sent. Verify to obtain access token.',
            'otp_expires_at' => $user->otp_expires_at,
            'user' => [
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 201);
    }

    // Now public: email + otp, issues token only after success
    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'digits:6'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();
        if (
            !$user ||
            !in_array($user->role, ['customer', 'admin', 'superadmin']) ||
            !$user->is_active
        ) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (
            !$user->otp_code ||
            !$user->otp_expires_at ||
            now()->greaterThan($user->otp_expires_at)
        ) {
            return response()->json(['message' => 'OTP expired or not set.'], 422);
        }

        if ($user->otp_code !== $data['otp']) {
            return response()->json(['message' => 'Invalid OTP code.'], 422);
        }

        // clear OTP & verify email
        $user->otp_code = null;
        $user->otp_expires_at = null;
        if (is_null($user->email_verified_at)) {
            $user->email_verified_at = now();
        }
        $user->save();

        // revoke old tokens (optional cleanup)
        $user->tokens()->delete();
        $newToken = $user->createToken($user->role.'-auth')->plainTextToken;

        // Different key for admin/superadmin
        if (in_array($user->role, ['admin','superadmin'])) {
            return response()->json([
                'message' => 'OTP verified. Admin token issued.',
                'admin_token' => $newToken, // added
                'user' => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->role,
                ],
            ], 200);
        }

        // Customer response (unchanged)
        return response()->json([
            'message' => 'OTP verified. Token issued.',
            'token'   => $newToken,
            'user'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ], 200);
    }

    public function resendOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();
        if (
            !$user ||
            !in_array($user->role, ['customer', 'admin', 'superadmin']) ||
            !$user->is_active
        ) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        Mail::html(
            $this->buildOtpEmailHtml($otp, 'Please verify your identity'),
            function ($message) use ($user) {
                $message->to($user->email)->subject('Your OTP Code');
            }
        );

        return response()->json([
            'message' => 'OTP resent.',
            'otp_expires_at' => $user->otp_expires_at,
        ], 200);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required','email'],
        ]);
        $email = strtolower(trim($data['email']));
        $user = User::where('email',$email)->first();
        if (!$user || !$user->is_active) {
            return response()->json(['message'=>'Email tidak ditemukan / tidak aktif'],404);
        }
        // generate OTP (reuse columns)
        $otp = str_pad((string)random_int(0,999999),6,'0',STR_PAD_LEFT);
        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();
        Mail::html(
            $this->buildOtpEmailHtml($otp,'Reset Your Password'),
            function($m) use ($user){ $m->to($user->email)->subject('Password Reset OTP'); }
        );
        return response()->json([
            'message'=>'OTP dikirim ke email. Masukkan OTP dan password baru.',
            'otp_expires_at'=>$user->otp_expires_at,
            'role'=>$user->role,
        ],200);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email'        => ['required','email'],
            'otp'          => ['required','digits:6'],
            'new_password' => ['required','string','min:6'],
        ]);
        $email = strtolower(trim($data['email']));
        $user = User::where('email',$email)->first();
        if (!$user || !$user->is_active) {
            return response()->json(['message'=>'Email tidak ditemukan / tidak aktif'],404);
        }
        if (!$user->otp_code || !$user->otp_expires_at || now()->greaterThan($user->otp_expires_at)) {
            return response()->json(['message'=>'OTP kadaluarsa'],422);
        }
        if ($user->otp_code !== $data['otp']) {
            return response()->json(['message'=>'OTP salah'],422);
        }
        // update password & clear otp
        $user->password = Hash::make($data['new_password']);
        $user->otp_code = null;
        $user->otp_expires_at = null;
        if (is_null($user->email_verified_at)) $user->email_verified_at = now();
        $user->save();
        // revoke tokens (optional)
        $user->tokens()->delete();
        return response()->json([
            'message'=>'Password berhasil diubah. Silakan login kembali.',
            'role'=>$user->role,
        ],200);
    }

    // NEW: verify OTP for password reset without issuing token or clearing OTP
    public function verifyResetOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required','email'],
            'otp'   => ['required','digits:6'],
        ]);
        $email = strtolower(trim($data['email']));
        $user = User::where('email',$email)->first();
        if (!$user || !$user->is_active) {
            return response()->json(['message'=>'Email tidak ditemukan / tidak aktif'],404);
        }
        if (!$user->otp_code || !$user->otp_expires_at || now()->greaterThan($user->otp_expires_at)) {
            return response()->json(['message'=>'OTP kadaluarsa'],422);
        }
        if ($user->otp_code !== $data['otp']) {
            return response()->json(['message'=>'OTP salah'],422);
        }
        // Do NOT clear otp_code here; wait until resetPassword succeeds.
        return response()->json([
            'message'=>'OTP valid. Silakan buat password baru.',
            'role'=>$user->role,
            'otp_expires_at'=>$user->otp_expires_at
        ],200);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            // Revoke only current token; or all if needed:
            $token = $user->currentAccessToken();
            if ($token) {
                $token->delete();
            } else {
                $user->tokens()->delete();
            }
        }
        return response()->json(['message' => 'Logged out'], 200);
    }

    public function googleLogin(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        // Verifikasi token Google (id_token)
        try {
            $response = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . $request->token);
            $googleUser = json_decode($response, true);
        } catch (\Throwable $e) {
            $googleUser = null;
        }

        if (!is_array($googleUser) || !isset($googleUser['email'])) {
            return response()->json(['message' => 'Token Google tidak valid'], 401);
        }

        $email = $googleUser['email'];

        // Jika user belum ada, buat otomatis (role customer)
        $user = \App\Models\User::where('email', $email)->first();
        if (! $user) {
            $name = $googleUser['name'] ?? explode('@', $email)[0];
            $user = \App\Models\User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(Str::random(16)),
                'role' => 'customer',
                'profile_image' => null,
            ]);
        }

        // Buat dan kembalikan token Sanctum (client akan simpan dan redirect ke beranda)
        $token = $user->createToken('google-login')->plainTextToken;

        return response()->json([
            'message' => 'Login Google berhasil',
            'user' => $user,
            'token' => $token,
        ], 200);
    }

    // Build Gmail-friendly HTML email directly from controller (no Blade)
    private function buildOtpEmailHtml(string $otp, string $headline = 'Please verify your identity'): string
    {
        $safeOtp = htmlspecialchars($otp, ENT_QUOTES, 'UTF-8');
        $safeHeadline = htmlspecialchars($headline, ENT_QUOTES, 'UTF-8');
        $year = date('Y');

        return <<<HTML
<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Verify your identity</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 0;">
    <tr>
      <td></td>
      <td width="560" style="width:560px;margin:0 auto;display:block;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);border:1px solid #eee;">
          <tr>
            <td style="padding:24px 24px 8px 24px;border-bottom:1px solid #f0f0f0;">
              <div style="font-size:14px;color:#004236;font-weight:600;letter-spacing:.2px;">The Body Shop</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;line-height:28px;color:#111827;">{$safeHeadline}</h1>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#374151;">
                Use the following one-time verification code to continue. This code will expire in 10 minutes.
              </p>
              <div style="margin:20px 0;padding:16px;border:1px solid #c1dad2;background:#f2faf8;border-radius:10px;text-align:center;">
                <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">Your verification code</div>
                <div style="font-size:28px;letter-spacing:8px;font-weight:700;color:#004236;">{$safeOtp}</div>
              </div>
              <p style="margin:0 0 8px 0;font-size:13px;line-height:20px;color:#6b7280;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">
                Thank you,<br/>Rare Beauty Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #f0f0f0;text-align:center;">
              <div style="font-size:11px;color:#9ca3af;">This is an automated message. Please do not reply.</div>
            </td>
          </tr>
        </table>
        <div style="text-align:center;margin-top:12px;font-size:11px;color:#9ca3af;">
          © {$year} The Body Shop. All rights reserved.
        </div>
      </td>
      <td></td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}