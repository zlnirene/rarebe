import axios from 'axios';

const token = localStorage.getItem('token');

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ${token}',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = 'Bearer ${token}';
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;