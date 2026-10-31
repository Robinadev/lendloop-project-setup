"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CONDITIONS } from "@/convex/constants";
import type { ActionRunner } from "@/components/lendloop/shared";

type ToolFormData = {
  name: string;
  category: string;
  condition: string;
  description: string;
};

type InitialTool = Pick<Doc<"tools">, "_id" | "name" | "category" | "condition" | "description">;

const blankTool: ToolFormData = {
  name: "",
  category: CATEGORIES[0],
  condition: CONDITIONS[1],
  description: "",
};

export function ToolForm({
  initial,
  onSaved,
  onCancel,
  run,
}: {
  initial?: InitialTool;
  onSaved?: () => void;
  onCancel?: () => void;
  run: ActionRunner;
}) {
  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);
  const [form, setForm] = useState<ToolFormData>(() =>
    initial
      ? {
          name: initial.name,
          category: initial.category,
          condition: initial.condition,
          description: initial.description,
        }
      : blankTool,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateText = (key: "name" | "description") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const saved = await run(
      () =>
        initial
          ? updateTool({ toolId: initial._id, ...form })
          : createTool(form),
      initial ? "Listing updated" : "Tool listed",
    );
    setIsSubmitting(false);
    if (!saved) return;
    if (!initial) setForm(blankTool);
    onSaved?.();
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="tool-name">Tool name</FieldLabel>
          <Input
            id="tool-name"
            name="name"
            autoComplete="off"
            maxLength={60}
            onChange={updateText("name")}
            placeholder="e.g. Cordless drill"
            required
            value={form.name}
          />
          <FieldDescription>Keep it clear and easy to recognize.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="tool-category">Category</FieldLabel>
          <Select
            value={form.category}
            onValueChange={(value) => setForm((current) => ({ ...current, category: value ?? "" }))}
          >
            <SelectTrigger id="tool-category" aria-label="Tool category" className="w-full">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="tool-condition">Condition</FieldLabel>
          <Select
            value={form.condition}
            onValueChange={(value) => setForm((current) => ({ ...current, condition: value ?? "" }))}
          >
            <SelectTrigger id="tool-condition" aria-label="Tool condition" className="w-full">
              <SelectValue placeholder="Choose a condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CONDITIONS.map((condition) => (
                  <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="tool-description">Description</FieldLabel>
          <Textarea
            id="tool-description"
            name="description"
            maxLength={280}
            onChange={updateText("description")}
            placeholder="Share any details that help a neighbor borrow it with care."
            required
            rows={3}
            value={form.description}
          />
          <FieldDescription>{form.description.length}/280 characters</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSubmitting} type="submit">
          <Check data-icon="inline-start" />
          {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add listing"}
        </Button>
        {onCancel ? (
          <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="ghost">
            <X data-icon="inline-start" />
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
