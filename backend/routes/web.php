<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GoogleOAuthController;

Route::get('/', function () {
    return view('welcome');
});

// Health (opsional)
Route::get('/health-web', fn() => response()->json(['status'=>'ok'],200));

// Google OAuth (tanpa /api prefix)
Route::get('/auth/google/redirect', [GoogleOAuthController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleOAuthController::class, 'callback'])->name('google.callback');
