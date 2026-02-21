
export const API = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password'
    },
    USERS: {
        GET_ALL: '/api/users',
        GET_ONE: '/api/users/:id',
        CREATE: '/api/users',
        UPDATE: '/api/users/:id',
        DELETE: '/api/users/:id',
    }
}