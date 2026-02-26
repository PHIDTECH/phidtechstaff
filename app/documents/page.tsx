"use client";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Plus, Search, Download, Eye, Upload, FolderOpen, Shield } from "lucide-react";
import { documents, users } from "@/lib/data";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const companyDocs = documents.filter(d => d.companyId === "c1");
  const categories = [...new Set(companyDocs.map(d => d.category))];

  const filtered = companyDocs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const docsByCategory = categories.map(cat => ({
    category: cat,
    docs: companyDocs.filter(d => d.category === cat),
  }));

  const categoryIcons: Record<string, string> = {
    "HR Policy": "📋",
    "Financial": "💰",
    "Technical": "⚙️",
    "Sales": "📈",
    "Legal": "⚖️",
    "Marketing": "📣",
  };

  const fileIcon = (name: string) => {
    if (name.endsWith(".pdf")) return "📄";
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "📊";
    if (name.endsWith(".docx") || name.endsWith(".doc")) return "📝";
    if (name.endsWith(".pptx") || name.endsWith(".ppt")) return "📑";
    return "📁";
  };

  return (
    <MainLayout>
      <PageHeader
        title="Document Management"
        subtitle="Upload, organize and manage company documents with version control"
        icon={FileText}
        actions={
          <Button size="sm" onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-4 h-4 mr-2" /> Upload Document
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Documents" value={companyDocs.length} icon={FileText} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Categories" value={categories.length} icon={FolderOpen} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard title="Avg. Version" value={`v${(companyDocs.reduce((s,d) => s + d.version, 0) / companyDocs.length).toFixed(1)}`} icon={Shield} iconBg="bg-orange-50" iconColor="text-orange-600" />
        <StatCard title="Recent Uploads" value={companyDocs.filter(d => new Date(d.uploadedAt) >= new Date("2026-02-01")).length} icon={Upload} iconBg="bg-green-50" iconColor="text-green-600" subtitle="This month" />
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="list">All Documents</TabsTrigger>
            <TabsTrigger value="folders">By Category</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(doc => {
                  const uploader = users.find(u => u.id === doc.uploadedBy);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{fileIcon(doc.name)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {doc.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        {uploader && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[10px]">{getInitials(uploader.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-700">{uploader.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDateTime(doc.uploadedAt)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{doc.size}</TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">v{doc.version}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc.permissions.slice(0,2).map(p => (
                            <span key={p} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{p}</span>
                          ))}
                          {doc.permissions.length > 2 && (
                            <span className="text-xs text-gray-400">+{doc.permissions.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="folders">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docsByCategory.map(({ category, docs: catDocs }) => (
              <div key={category} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                    {categoryIcons[category] || "📁"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category}</h3>
                    <p className="text-xs text-gray-400">{catDocs.length} document{catDocs.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {catDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{fileIcon(doc.name)}</span>
                        <p className="text-sm text-gray-700 truncate">{doc.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-mono text-gray-400">v{doc.version}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Download className="w-3 h-3 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, PPTX up to 50MB</p>
              <input type="file" className="hidden" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {["HR Policy","Financial","Technical","Sales","Legal","Marketing","Other"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Permissions</label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Who can access?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="admin">Admin Only</SelectItem>
                  <SelectItem value="manager">Managers & Above</SelectItem>
                  <SelectItem value="department">Department Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowUploadDialog(false)}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
