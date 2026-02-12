
export const API = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password'
    },
    USERS: {
        GET_ALL: '/users',
        GET_ONE: '/users/:id',
        CREATE: '/users',
        UPDATE: '/users/:id',
        DELETE: '/users/:id',
    }
}