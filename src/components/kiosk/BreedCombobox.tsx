'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const COMMON_BREEDS = [
  'Labrador Retriever',
  'Golden Retriever',
  'Bulldog Francés',
  'Chihuahua',
  'Poodle',
  'Pastor Alemán',
  'Beagle',
  'Yorkshire Terrier',
  'Dachshund',
  'Boxer',
  'Schnauzer',
  'Pug',
  'Shih Tzu',
  'Maltés',
  'Cocker Spaniel',
  'Border Collie',
  'Husky Siberiano',
  'Rottweiler',
  'Doberman',
  'Pomerania',
  'Mestizo',
  'Criollo'
].sort();

interface BreedComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function BreedCombobox({ value, onChange }: BreedComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [breeds, setBreeds] = useState<string[]>(COMMON_BREEDS);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = () => {
    if (search.trim() && !breeds.includes(search.trim())) {
      const newBreed = search.trim();
      setBreeds([...breeds, newBreed].sort());
      onChange(newBreed);
      setOpen(false);
      setSearch('');
    }
  };

  const filteredBreeds = search
    ? breeds.filter(breed => breed.toLowerCase().includes(search.toLowerCase()))
    : breeds;

  const showCreateOption = search.trim() && !breeds.some(b => b.toLowerCase() === search.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-12 justify-between text-lg"
        >
          <span className={cn(!value && "text-slate-400")}>
            {value || "Selecciona o escribe una raza"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar o escribir raza..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>
            {showCreateOption ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-left font-normal"
                onClick={handleCreateNew}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear "{search}"
              </Button>
            ) : (
              <div className="py-6 text-center text-sm text-slate-500">
                No se encontró la raza. Escribe para crear una nueva.
              </div>
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredBreeds.map((breed) => (
              <CommandItem
                key={breed}
                value={breed}
                onSelect={() => handleSelect(breed)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === breed ? "opacity-100" : "opacity-0"
                  )}
                />
                {breed}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}