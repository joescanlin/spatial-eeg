import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface PatientFormData {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  height_cm: string;
  dx_icd10: string;
  notes: string;
}

interface PatientCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: any) => void;
}

export function PatientCreateForm({
  isOpen,
  onClose,
  onPatientCreated
}: PatientCreateFormProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    height_cm: '',
    dx_icd10: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState<Partial<PatientFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<PatientFormData> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    if (formData.height_cm && (parseFloat(formData.height_cm) <= 0 || parseFloat(formData.height_cm) > 300)) {
      newErrors.height_cm = 'Height must be between 1 and 300 cm';
    }
    
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.date_of_birth = 'Birth date cannot be in the future';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Prepare data for API
      const apiData = {
        clinic_id: 1, // Default clinic ID - in production, this would be user's clinic
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        dx_icd10: formData.dx_icd10.trim() || null,
        notes: formData.notes.trim() || null
      };
      
      // API call to create patient
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create patient');
      }
      
      const newPatient = await response.json();
      
      // Calculate age for display
      if (newPatient.date_of_birth) {
        const birthDate = new Date(newPatient.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() - 
          ((today.getMonth(), today.getDate()) < (birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
        newPatient.age = age;
      }
      
      // Add computed fields for compatibility with existing components
      newPatient.sessions_count = 0;
      newPatient.last_visit = null;
      newPatient.diagnosis = newPatient.dx_icd10; // Map dx_icd10 to diagnosis for compatibility
      
      // Success - notify parent and close form
      onPatientCreated(newPatient);
      onClose();
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        gender: '',
        date_of_birth: '',
        height_cm: '',
        dx_icd10: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error creating patient:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">Add New Patient</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6">
          <div className="space-y-6">
            
            {/* Error Banner */}
            {submitError && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Error Creating Patient</div>
                  <div className="text-sm">{submitError}</div>
                </div>
              </div>
            )}
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                    errors.first_name ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                />
                {errors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                    errors.last_name ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                />
                {errors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
                )}
              </div>
            </div>
            
            {/* Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                    errors.date_of_birth ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.date_of_birth && (
                  <p className="text-red-500 text-sm mt-1">{errors.date_of_birth}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                    errors.height_cm ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'
                  }`}
                  placeholder="170"
                  min="1"
                  max="300"
                  disabled={isSubmitting}
                />
                {errors.height_cm && (
                  <p className="text-red-500 text-sm mt-1">{errors.height_cm}</p>
                )}
              </div>
            </div>
            
            {/* Medical Information */}
            <div>
              <label className="block text-sm font-medium mb-2">Diagnosis (ICD-10 Code)</label>
              <input
                type="text"
                value={formData.dx_icd10}
                onChange={(e) => handleInputChange('dx_icd10', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., M25.561 (Knee pain), S83.511A (ACL sprain)"
                disabled={isSubmitting}
              />
              <p className="text-gray-400 text-xs mt-1">
                Enter the primary diagnosis ICD-10 code for this patient
              </p>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter any additional notes about the patient (allergies, medical history, special considerations, etc.)"
                maxLength={5000}
                disabled={isSubmitting}
              />
              <p className="text-gray-400 text-xs mt-1">
                {formData.notes.length}/5000 characters
              </p>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatientCreateForm;