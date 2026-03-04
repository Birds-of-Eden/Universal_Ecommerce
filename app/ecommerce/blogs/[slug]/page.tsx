'use client';

import { Metadata } from "next";
import BlogDetails from "@/components/admin/blog/BlogDetails";

// Since this is a dynamic route with client component, 
// we'll handle SEO through the BlogDetails component
export default function BlogDetailsPage() {
    return <BlogDetails />;
}
