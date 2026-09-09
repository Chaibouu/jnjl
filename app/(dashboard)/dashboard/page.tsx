import { Suspense } from "react";
import { getBlogsAction, getBlogPostsAction } from "@/actions/blog-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsSkeleton, RecentPostsSkeleton } from "@/components/skeletons";
import Link from "next/link";

// Composant pour les statistiques du dashboard
async function DashboardStats() {
  const blogsData = await getBlogsAction(new URLSearchParams());
  const postsData = await getBlogPostsAction(new URLSearchParams());

  // Vérifier que les données existent et ont la bonne structure
  const blogs = blogsData.success && blogsData.data?.data ? blogsData.data.data : [];
  const posts = postsData.success && postsData.data?.data ? postsData.data.data : [];

  const stats = {
    totalBlogs: blogs.length,
    publishedBlogs: blogs.filter((blog: any) => blog?.isPublished).length,
    totalPosts: posts.length,
    publishedPosts: posts.filter((post: any) => post?.isPublished).length,
    recentPosts: posts.slice(0, 5),
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Blogs</CardTitle>
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBlogs}</div>
          <p className="text-xs text-muted-foreground">
            {stats.publishedBlogs} publiés
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPosts}</div>
          <p className="text-xs text-muted-foreground">
            {stats.publishedPosts} publiés
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blogs Publiés</CardTitle>
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.publishedBlogs}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalBlogs > 0 
              ? `${Math.round((stats.publishedBlogs / stats.totalBlogs) * 100)}%`
              : "0%"
            } de publication
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Posts Publiés</CardTitle>
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.publishedPosts}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalPosts > 0 
              ? `${Math.round((stats.publishedPosts / stats.totalPosts) * 100)}%`
              : "0%"
            } de publication
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant pour les posts récents
async function RecentPosts() {
  const postsData = await getBlogPostsAction(new URLSearchParams());

  if (!postsData.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Erreur: {postsData.error}</p>
        </CardContent>
      </Card>
    );
  }

  // Vérifier que les données existent et ont la bonne structure
  if (!postsData.data?.data || !Array.isArray(postsData.data.data)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucun post pour le moment.</p>
          <Link href="/blogs/create" className="mt-4 inline-block">
            <Button size="sm">Créer votre premier blog</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const posts = postsData.data.data.slice(0, 5);

  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posts Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucun post pour le moment.</p>
          <Link href="/blogs/create" className="mt-4 inline-block">
            <Button size="sm">Créer votre premier blog</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts Récents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {posts.map((post: any) => (
            <div key={post.id} className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  <Link 
                    href={`/blogs/${post.blog?.id || 'unknown'}/posts/${post.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {post.title}
                  </Link>
                </h4>
                <p className="text-xs text-gray-500">
                  Dans {post.blog?.title || 'Blog inconnu'} • {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={post.isPublished ? "default" : "secondary"} className="text-xs">
                {post.isPublished ? "Publié" : "Brouillon"}
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/blogs">
            <Button variant="outline" size="sm">
              Voir tous les posts
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour les actions rapides
function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions Rapides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <Link href="/blogs/create">
            <Button className="w-full justify-start">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Créer un nouveau blog
            </Button>
          </Link>
          <Link href="/blogs">
            <Button variant="outline" className="w-full justify-start">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              Gérer mes blogs
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Page principale
export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-gray-600 mt-2">
          Bienvenue ! Voici un aperçu de vos blogs et posts.
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<RecentPostsSkeleton />}>
          <RecentPosts />
        </Suspense>
        
        <QuickActions />
      </div>
    </div>
  );
} 