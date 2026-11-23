export const authDestination = role => role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor/dashboard' : '/';
