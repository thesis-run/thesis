import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Retry helper for Safari 18 intermittent CORS failures
const signInWithRetry = async (
  email: string,
  password: string,
  maxRetries = 3
): Promise<ReturnType<typeof supabase.auth.signInWithPassword>> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      // If we get a response (even an auth error), return it - don't retry auth errors
      if (result.error && !result.error.message?.includes('fetch')) {
        return result;
      }
      
      // Success or non-network error
      if (!result.error || result.data?.session) {
        return result;
      }
      
      lastError = result.error;
    } catch (err) {
      lastError = err;
    }
    
    // Only retry on network-like errors
    if (attempt < maxRetries - 1) {
      const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms, 2000ms
      console.log(`[EditorLogin] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Return the last error
  return { data: { user: null, session: null }, error: lastError };
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function EditorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Validation error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await signInWithRetry(
        validation.data.email,
        validation.data.password
      );

      if (error) throw error;

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user?.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error("You don't have editor access");
      }

      navigate("/editor", { replace: true });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img 
            src="/robomart-login-logo.png" 
            alt="Robomart Logo" 
            className="w-16 h-16 mx-auto"
          />
          <h1 className="text-2xl font-bold">Editor Login</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to access the petition editor
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
