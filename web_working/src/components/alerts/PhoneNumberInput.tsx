import React from 'react';
import { Phone } from 'lucide-react';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function PhoneNumberInput({ value, onChange }: PhoneNumberInputProps) {
  return (
    <div>
      <label htmlFor="phone-input" className="flex items-center gap-2 text-sm text-gray-400">
        <Phone size={16} />
        Phone Number
      </label>
      <input
        id="phone-input"
        name="phone-number"
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-gray-700 rounded px-3 py-2 text-sm"
        placeholder="+1234567890"
      />
    </div>
  );
}