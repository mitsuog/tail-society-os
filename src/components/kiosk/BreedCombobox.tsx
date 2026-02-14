'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface BreedComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

// Lista de razas comunes (misma que en AddClientDialog)
const COMMON_BREEDS = [
  "Mestizo", "Labrador", "Golden Retriever", "Pastor Alemán", "Bulldog Francés", 
  "Bulldog Inglés", "Poodle", "Beagle", "Chihuahua", "Pug", "Husky", 
  "Boxer", "Salchicha", "Yorkshire", "Shih Tzu", "Schnauzer", 
  "Pomerania", "Doberman", "Gran Danés", "Rottweiler", "Cocker Spaniel", "Border Collie", 
  "Maltés", "Jack Russell", "Shiba Inu", "Boston Terrier", 
  "Bernés", "Pastor Australiano", "San Bernardo", "Samoyedo", "Akita", 
  "Chow Chow", "Dálmata", "Gato Doméstico", "Persa", "Siamés", "Maine Coon", "Bengala"
].sort();

export function BreedCombobox({ value, onChange }: BreedComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [breeds, setBreeds] = useState<string[]>(COMMON_BREEDS);

  const filteredBreeds = breeds.filter(breed =>
    breed.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateNew = () => {
    if (!search.trim()) return;
    
    const newBreed = search.charAt(0).toUpperCase() + search.slice(1).toLowerCase();
    
    if (!breeds.includes(newBreed)) {
      const updatedBreeds = [...breeds, newBreed].sort();
      setBreeds(updatedBreeds);
    }
    
    onChange(newBreed);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 font-normal text-slate-900 border-slate-200"
        >
          {value || "Seleccionar o escribir..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar raza..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>
              {search ? (
                <div className="p-2">
                  <Button
                    onClick={handleCreateNew}
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    <Plus size={14} className="mr-2" />
                    Crear "{search}"
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500 p-2">No se encontraron razas</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredBreeds.map((breed) => (
                <CommandItem
                  key={breed}
                  value={breed}
                  onSelect={(currentValue) => {
                    const originalValue = breeds.find(
                      b => b.toLowerCase() === currentValue.toLowerCase()
                    ) || currentValue;
                    onChange(originalValue);
                    setOpen(false);
                    setSearch("");
                  }}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}