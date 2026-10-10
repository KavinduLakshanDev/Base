import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: LoginProps) {
    return (
        <AuthLayout
            title="Welcome back"
            description="Sign in to manage your distribution business"
        >
            <Head title="Log in" />

            {status && (
                <div className="mb-4 p-4 text-center text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6 mt-2"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-gray-700 font-medium">
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                    className="h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password" className="text-gray-700 font-medium">
                                        Password
                                    </Label>
                                    {/* {canResetPassword && (
                                        <TextLink
                                            href={request().url}
                                            className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )} */}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="h-12 px-4 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="border-gray-300"
                                />
                                <Label htmlFor="remember" className="text-gray-700 font-normal cursor-pointer">
                                    Remember me for 30 days
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {processing ? 'Signing in...' : 'Sign in to your account'}
                            </Button>
                        </div>

                        {/* {canRegister && (
                            // <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200">
                            //     Don't have an account?{' '}
                            //     <TextLink href={register().url} tabIndex={5} className="text-blue-600 hover:text-blue-700 font-semibold">
                            //         Create a free account
                            //     </TextLink>
                            // </div>
                        )} */}
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
