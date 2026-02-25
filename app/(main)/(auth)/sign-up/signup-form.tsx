"use client";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { signUpSchema } from "@/validators/authValidators";
import { useForm } from "react-hook-form";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormFieldset,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import Link from "next/link";
import { FormError } from "../../../../components/FormError";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";

type SignUpValues = yup.InferType<typeof signUpSchema>;

const SignupForm = () => {
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<SignUpValues>({
    resolver: yupResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignUpValues) => {
    setFormError("");
    const loadingId = toast.loading("Creating your account...");

    try {
      // 1) Create user via your API
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Registration failed");
      }

      // 2) Auto sign-in with NextAuth credentials
      const signInRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      toast.dismiss(loadingId);

      if (!signInRes?.ok) {
        throw new Error(
          signInRes?.error || "Sign in after registration failed"
        );
      }

      toast.success("Account created! You're now signed in.");
      router.push("/admin/");
    } catch (err: unknown) {
      toast.dismiss(loadingId);
      const msg = (err instanceof Error ? err.message : String(err)) || "Something went wrong";
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <Card className="border border-[#5FA3A3]/40 bg-[#F4F8F7] shadow-md max-w-md mx-auto">
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0E4B4B] via-[#5FA3A3] to-[#C0704D] rounded-t-xl" />

      <CardHeader className="items-center pb-4 pt-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E4B4B]/10 text-[#0E4B4B]">
          <User className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-semibold text-[#0D1414]">
          Sign Up
        </CardTitle>
        <CardDescription className="text-sm text-[#0D1414]/70 text-center">
          Create your account to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 pb-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormFieldset className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[#0D1414]">
                      Name
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="Enter your name"
                          autoComplete="name"
                          className="border-[#5FA3A3]/50 bg-[#F4F8F7] text-[#0D1414] placeholder:text-[#0D1414]/50 focus-visible:ring-[#5FA3A3] focus-visible:border-[#5FA3A3] pr-10"
                          {...field}
                        />
                      </FormControl>
                      <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0D1414]/50" />
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[#0D1414]">
                      Email
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          autoComplete="email"
                          className="border-[#5FA3A3]/50 bg-[#F4F8F7] text-[#0D1414] placeholder:text-[#0D1414]/50 focus-visible:ring-[#5FA3A3] focus-visible:border-[#5FA3A3] pr-10"
                          {...field}
                        />
                      </FormControl>
                      <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0D1414]/50" />
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-[#0D1414]">
                      Password
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          autoComplete="new-password"
                          className="border-[#5FA3A3]/50 bg-[#F4F8F7] text-[#0D1414] placeholder:text-[#0D1414]/50 focus-visible:ring-[#5FA3A3] focus-visible:border-[#5FA3A3] pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0D1414]/60 hover:text-[#0D1414]"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0D1414]/40" />
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </FormFieldset>

            <FormError message={formError} />

            <Button
              type="submit"
              className="mt-2 w-full rounded-lg bg-[#C0704D] text-white hover:bg-[#C0704D]/90 border border-[#C0704D] text-sm font-medium py-2.5 shadow-sm hover:shadow-md transition-all duration-200"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#5FA3A3]/50" />
          <span className="text-xs text-[#0D1414]/60">or</span>
          <div className="h-px flex-1 bg-[#5FA3A3]/50" />
        </div>

        {/* Already have account */}
        <div className="mt-4 text-center text-sm">
          <span className="text-[#0D1414]/70">
            Already have an account?{" "}
          </span>
          <Link
            href="/signin"
            className="font-medium text-[#0E4B4B] hover:underline"
          >
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignupForm;
