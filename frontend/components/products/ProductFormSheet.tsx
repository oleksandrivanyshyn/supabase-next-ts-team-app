"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/products/dropzone";
import { useSupabaseUpload } from "@/hooks/useSupabaseUpload";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import type { ProductListItem } from "@/types/types";

const productSchema = z.object({
  title: z.string().min(1, "Required").max(200, "Must be 200 characters or fewer"),
  description: z.string().optional(),
});

type ProductFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListItem | null;
  teamId: string;
};

export function ProductFormSheet({ open, onOpenChange, product, teamId }: ProductFormSheetProps) {
  const readOnly = product ? product.status !== "draft" : false;
  const isDeleted = product?.status === "deleted";
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { title: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ title: product?.title ?? "", description: product?.description ?? "" });
    }
  }, [open, product, reset]);

  // Fresh slot id per create session; real product id once a draft exists.
  const uploadPath = useMemo(
    () => (product ? `${teamId}/${product.id}` : `${teamId}/${crypto.randomUUID()}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, product?.id, teamId],
  );

  const upload = useSupabaseUpload({
    bucketName: "product-images",
    path: uploadPath,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 1,
    upsert: true,
  });

  const isPending = createProduct.isPending || updateProduct.isPending;

  const imagePreview = product?.imageUrl ? (
    <Image
      src={product.imageUrl}
      alt={product.title}
      width={96}
      height={96}
      className="h-24 w-24 rounded-md border object-cover"
    />
  ) : null;

  const onSubmit = handleSubmit(async (values) => {
    const uploadedPath =
      upload.successes.length > 0 ? `${uploadPath}/${upload.successes[0]}` : undefined;

    try {
      if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          title: values.title,
          description: values.description,
          ...(uploadedPath ? { imagePath: uploadedPath } : {}),
        });
        toast.success("Product updated");
      } else {
        await createProduct.mutateAsync({
          title: values.title,
          description: values.description,
          ...(uploadedPath ? { imagePath: uploadedPath } : {}),
        });
        toast.success("Product created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{product ? (readOnly ? "View product" : "Edit product") : "New product"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-4">
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input id="title" disabled={readOnly} {...register("title")} />
            <FieldError errors={[errors.title]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea id="description" disabled={readOnly} rows={4} {...register("description")} />
            <FieldError errors={[errors.description]} />
          </Field>

          {!readOnly && (
            <Field>
              <FieldLabel>Image</FieldLabel>
              {imagePreview}
              <Dropzone {...upload}>
                <DropzoneEmptyState />
                <DropzoneContent />
              </Dropzone>
            </Field>
          )}

          {readOnly && imagePreview && (
            <Field>
              <FieldLabel>Image</FieldLabel>
              {imagePreview}
            </Field>
          )}

          {!readOnly && (
            <SheetFooter className="px-0">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </SheetFooter>
          )}
          {readOnly && !isDeleted && (
            <p className="text-sm text-muted-foreground">
              Active products can only have their status changed, from the row menu.
            </p>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
