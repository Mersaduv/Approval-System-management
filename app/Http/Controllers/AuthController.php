<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Show the login form
     */
    public function showLoginForm()
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle login request
     */
    public function login(Request $request)
    {
        // Manual validation to avoid automatic redirect
        $validator = \Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator->errors())->withInput();
        }

        $credentials = $request->only('email', 'password');
        $remember = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            $request->session()->regenerate();

            // Debug: Log successful authentication
            Log::info('User authenticated successfully', [
                'user_id' => Auth::id(),
                'email' => $request->email
            ]);

            // Check if user was trying to access approval portal
            $intended = $request->session()->get('url.intended');
            if ($intended && str_contains($intended, '/approval-portal/')) {
                return redirect($intended);
            }

            // Return Inertia response for SPA
            return redirect()->intended('/');
        }

        // Debug: Log failed authentication
        Log::warning('Authentication failed', [
            'email' => $request->email,
            'ip' => $request->ip()
        ]);

        // Log the error response
        Log::info('Returning validation errors', [
            'errors' => ['email' => 'Authentication failed'],
            'is_inertia' => $request->header('X-Inertia')
        ]);

        // Return validation errors for Inertia.js
        // Use Inertia::render instead of back() to avoid redirect
        return Inertia::render('Auth/Login', [
            'errors' => [
                'password' => 'The provided credentials do not match our records.',
            ],
            'old' => $request->only('email', 'remember')
        ]);
    }

    /**
     * Handle logout request
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }

    /**
     * Get authenticated user data
     */
    public function user(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load(['department', 'role'])
        ]);
    }
}
