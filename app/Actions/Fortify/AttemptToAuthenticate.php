<?php

namespace App\Actions\Fortify;

use Illuminate\Auth\AuthManager;
use Illuminate\Contracts\Auth\StatefulGuard;
use Laravel\Fortify\Actions\AttemptToAuthenticate as BaseAttemptToAuthenticate;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\LoginRateLimiter;

class AttemptToAuthenticate extends BaseAttemptToAuthenticate
{
    protected $auth;

    public function __construct(AuthManager $auth, StatefulGuard $guard, LoginRateLimiter $limiter)
    {
        \Illuminate\Support\Facades\Log::info('AttemptToAuthenticate constructor', [
            'auth' => get_class($auth),
            'guard' => get_class($guard),
            'limiter' => get_class($limiter),
        ]);
        parent::__construct($guard, $limiter);
        $this->auth = $auth;
    }

    public function handle($request, $next)
    {
        $credentials = $request->only(Fortify::username(), 'password');

        // Try web guard first
        $userProvider = $this->guard->getProvider();
        $user = $userProvider->retrieveByCredentials($credentials);

        if ($user && $userProvider->validateCredentials($user, $credentials)) {
            if (!$user->is_active) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    Fortify::username() => ['Your account is inactive. Please contact the administrator.'],
                ]);
            }
            
            $this->guard->login($user, $request->boolean('remember'));
            return $next($request);
        }

        // Try company guard
        $companyProvider = $this->auth->guard('company')->getProvider();
        $company = $companyProvider->retrieveByCredentials($credentials);

        if ($company && $companyProvider->validateCredentials($company, $credentials)) {
            if (!$company->is_active) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    Fortify::username() => ['Your company account is inactive. Please contact the administrator.'],
                ]);
            }
            
            $this->auth->guard('company')->login($company, $request->boolean('remember'));
            return $next($request);
        }

        $this->throwFailedAuthenticationException($request);
    }
}
