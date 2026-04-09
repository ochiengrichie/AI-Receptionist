import api from './client';

export async function getMe() {
    const res = await api.get('/auth/me');
    return res.data;
}

export async function registerUser(payload) {
    const res = await api.post('/auth/register', payload);
    return res.data;
}

export async function logInUser(payload) {
    const res = await api.post('/auth/login', payload);
    return res.data;
}

export async function logoutUser() {
    const res = await api.post('/auth/logout');
    return res.data;
}