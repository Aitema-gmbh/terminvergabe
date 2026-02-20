<!--
  aitema|Termin - Login Page
  Keycloak OIDC Login with PKCE
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth, isAuthenticated, isLoading, authError } from '$lib/auth';

  let loginInProgress = false;
  let errorMessage = '';

  // If already authenticated, redirect to staff dashboard
  onMount(async () => {
    await auth.initAuth();

    if ($isAuthenticated) {
      const redirect = $page.url.searchParams.get('redirect') ?? '/staff';
      goto(redirect, { replaceState: true });
    }
  });

  async function handleLogin() {
    loginInProgress = true;
    errorMessage = '';
    try {
      const redirect = $page.url.searchParams.get('redirect') ?? '/staff';
      await auth.login(redirect);
      // login() redirects to Keycloak, so this line is only reached on error
    } catch (err) {
      errorMessage = (err as Error).message;
      loginInProgress = false;
    }
  }
</script>

<svelte:head>
  <title>Anmelden - aitema|Termin</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="w-full max-w-sm space-y-8 p-8 bg-white rounded-2xl shadow-md">

    <!-- Logo / Header -->
    <div class="text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
        <svg class="h-7 w-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">aitema<span class="text-blue-600">|</span>Termin</h1>
      <p class="mt-1 text-sm text-gray-500">Mitarbeiter-Login</p>
    </div>

    <!-- Error Message -->
    {#if errorMessage || $authError}
      <div class="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700" role="alert">
        <p class="font-medium">Anmeldung fehlgeschlagen</p>
        <p class="mt-1">{errorMessage || $authError}</p>
      </div>
    {/if}

    <!-- Login Button -->
    <button
      type="button"
      on:click={handleLogin}
      disabled={loginInProgress || $isLoading}
      class="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm
             hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
             disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
    >
      {#if loginInProgress || $isLoading}
        <!-- Spinner -->
        <svg class="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span>Wird angemeldet...</span>
      {:else}
        <!-- Keycloak icon placeholder -->
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
        </svg>
        <span>Mit Keycloak anmelden</span>
      {/if}
    </button>

    <p class="text-center text-xs text-gray-400">
      Gesicherte Anmeldung via OpenID Connect
    </p>
  </div>
</div>
