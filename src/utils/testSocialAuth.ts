import { supabase } from '../supabaseClient';

export interface AuthProviderStatus {
  provider: string;
  enabled: boolean;
  configured: boolean;
  error?: string;
}

export const testSocialAuthProviders = async (): Promise<AuthProviderStatus[]> => {
  const providers = ['google', 'apple', 'azure', 'facebook'] as const;
  const results: AuthProviderStatus[] = [];

  for (const provider of providers) {
    try {
      // Test if provider is configured by attempting to get auth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true // Don't actually redirect, just test
        }
      });

      results.push({
        provider,
        enabled: true,
        configured: !error,
        error: error?.message
      });
    } catch (err) {
      results.push({
        provider,
        enabled: false,
        configured: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  return results;
};

export const logAuthProviderStatus = async () => {
  console.log('🔍 Testing Social Auth Providers...');
  const results = await testSocialAuthProviders();
  
  results.forEach(result => {
    const status = result.configured ? '✅' : '❌';
    const message = result.configured 
      ? `${status} ${result.provider.toUpperCase()} - Configured`
      : `${status} ${result.provider.toUpperCase()} - ${result.error}`;
    
    console.log(message);
  });

  const configuredCount = results.filter(r => r.configured).length;
  console.log(`\n📊 Summary: ${configuredCount}/${results.length} providers configured`);
  
  if (configuredCount === 0) {
    console.log('\n💡 To configure providers, follow the setup guide in setup-social-auth.md');
  }

  return results;
}; 