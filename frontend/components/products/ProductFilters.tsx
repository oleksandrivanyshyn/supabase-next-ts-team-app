"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/useTeam";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ProductFilters as ProductFiltersType } from "@/types/types";

type ProductFiltersProps = {
  filters: ProductFiltersType;
  onFiltersChange: (filters: ProductFiltersType) => void;
};

export function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const { data: members } = useTeamMembers();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Read the latest filters/onFiltersChange via ref instead of depending on
  // them directly — this effect should fire only when the debounced search
  // value actually settles, not on every unrelated filter change (which
  // would otherwise re-run this and re-invoke onFiltersChange redundantly).
  const latest = useRef({ filters, onFiltersChange });
  useEffect(() => {
    latest.current = { filters, onFiltersChange };
  });

  useEffect(() => {
    const { filters: currentFilters, onFiltersChange: currentOnFiltersChange } = latest.current;
    if (debouncedSearch !== (currentFilters.search ?? "")) {
      currentOnFiltersChange({ ...currentFilters, search: debouncedSearch || undefined });
    }
  }, [debouncedSearch]);

  const dateRange = {
    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
  };

  const selectedCreator = members?.find((m) => m.id === filters.createdBy);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search title or description..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-56"
      />

      <Select
        value={filters.status ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === "all" ? undefined : (value as ProductFiltersType["status"]),
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="deleted">Deleted</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          <CalendarIcon className="size-4" />
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
              </>
            ) : (
              format(dateRange.from, "MMM d, yyyy")
            )
          ) : (
            "Date range"
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) =>
              onFiltersChange({
                ...filters,
                dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
                dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
              })
            }
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Popover open={creatorOpen} onOpenChange={setCreatorOpen}>
        <PopoverTrigger render={<Button variant="outline" className="justify-between" />}>
          <span className="truncate">{selectedCreator?.displayName ?? "Any creator"}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search teammate..." />
            <CommandList>
              <CommandEmpty>No teammate found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onFiltersChange({ ...filters, createdBy: undefined });
                    setCreatorOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-4", !filters.createdBy ? "opacity-100" : "opacity-0")}
                  />
                  Any creator
                </CommandItem>
                {members?.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.displayName}
                    onSelect={() => {
                      onFiltersChange({ ...filters, createdBy: member.id });
                      setCreatorOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        filters.createdBy === member.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {member.displayName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
