"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Search, ListFilter as Filter, Star, Download, Users, Tag, Check, ExternalLink, LayoutTemplate, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/store";

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  icon: string | null;
  price: number;
  is_free: boolean;
  downloads: number;
  rating_avg: number;
  rating_count: number;
  author_id: string;
}

const categories = [
  "All",
  "E-commerce",
  "Social Media",
  "Search Engines",
  "News & Media",
  "Real Estate",
  "Job Boards",
  "Directories",
];

const sampleTemplates: Template[] = [
  {
    id: "1",
    name: "Google Maps Business Scraper",
    slug: "google-maps-business",
    description: "Extract business data from Google Maps including name, address, phone, rating, and reviews.",
    category: "Search Engines",
    tags: ["google", "maps", "business", "local"],
    icon: "Store",
    price: 0,
    is_free: true,
    downloads: 15234,
    rating_avg: 4.8,
    rating_count: 324,
    author_id: "author1",
  },
  {
    id: "2",
    name: "LinkedIn Profile Scraper",
    slug: "linkedin-profile",
    description: "Extract professional profiles with name, title, company, experience, and skills from LinkedIn.",
    category: "Social Media",
    tags: ["linkedin", "profiles", "professional"],
    icon: "Users",
    price: 0,
    is_free: true,
    downloads: 8921,
    rating_avg: 4.6,
    rating_count: 187,
    author_id: "author2",
  },
  {
    id: "3",
    name: "Amazon Product Extractor",
    slug: "amazon-product",
    description: "Extract product listings, prices, reviews, and ratings from Amazon.",
    category: "E-commerce",
    tags: ["amazon", "products", "e-commerce"],
    icon: "ShoppingCart",
    price: 9.99,
    is_free: false,
    downloads: 4521,
    rating_avg: 4.9,
    rating_count: 92,
    author_id: "author3",
  },
];

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [categories, setCategories] = useState<string[]>(["All", "E-commerce", "Social Media", "Search Engines", "News", "Real Estate"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sortBy, setSortBy] = useState("popular");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await api.marketplace.list({
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          search: search || undefined,
          sort: sortBy,
        });
        if (data.length > 0) setTemplates(data);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };

    fetchTemplates();
  }, [selectedCategory, search, sortBy]);

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">
            Browse and use pre-built automation templates
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Submit Template
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 whitespace-nowrap">
                <Filter className="h-4 w-4" />
                Sort: {sortBy === "popular" ? "Most Popular" : sortBy === "rating" ? "Highest Rated" : "Newest"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("popular")}>
                Most Popular
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")}>
                Highest Rated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                Newest
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence>
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              variants={itemVariants}
              layout
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-full flex flex-col overflow-hidden group">
                <CardContent className="flex-1 pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-info/20">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.is_free ? "Free" : `$${template.price}`}
                    </Badge>
                  </div>

                  <h3 className="font-semibold mb-2">{template.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span>
                        {template.rating_avg.toFixed(1)} ({template.rating_count})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>
                        {template.downloads >= 1000
                          ? `${(template.downloads / 1000).toFixed(1)}k`
                          : template.downloads}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    className="w-full gap-2 group"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <Download className="h-4 w-4" />
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {selectedTemplate && (
        <Dialog
          open={!!selectedTemplate}
          onOpenChange={() => setSelectedTemplate(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-warning fill-warning" />
                  <span className="font-medium">
                    {selectedTemplate.rating_avg.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({selectedTemplate.rating_count} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-5 w-5" />
                  <span>{selectedTemplate.downloads.toLocaleString()} downloads</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">What this template does:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Opens the target website
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Navigates to search/listings
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Extracts structured data
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Handles pagination
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
              >
                Cancel
              </Button>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Add to Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
