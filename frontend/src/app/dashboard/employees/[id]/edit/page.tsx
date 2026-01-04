'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { employeeApi } from '@/lib/api/employee';
import { departmentApi } from '@/lib/api/department';
import { Employee, Department } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface FormData {
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  phone: string;
  mobile: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  national_id: string;
  passport_number: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  department_id: string;
  position: string;
  employment_type: string;
  status: string;
  hire_date: string;
  probation_end_date: string;
}

export default function EditEmployeePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const router = useRouter();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    mobile: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    nationality: '',
    national_id: '',
    passport_number: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'United States'
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    department_id: '',
    position: '',
    employment_type: 'full_time',
    status: 'active',
    hire_date: '',
    probation_end_date: ''
  });

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeeData, deptData] = await Promise.all([
        employeeApi.getEmployee(employeeId),
        departmentApi.getDepartments()
      ]);
      
      setEmployee(employeeData);
      setDepartments(deptData);
      
      // Populate form with existing data
      setFormData({
        first_name: employeeData.first_name || '',
        last_name: employeeData.last_name || '',
        middle_name: employeeData.middle_name || '',
        email: employeeData.email: employeeData.phone || '',
        phone || '',
        mobile: employeeData.mobile || '',
        date_of_birth: employeeData.date_of_birth ? new Date(employeeData.date_of_birth).toISOString().split('T')[0] : '',
        gender: employeeData.gender || '',
        marital_status: employeeData.marital_status || '',
        nationality: employeeData.nationality || '',
        national_id: employeeData.national_id || '',
        passport_number: employeeData.passport_number || '',
        address: employeeData.address || {
          street: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'United States'
        },
        emergency_contact: employeeData.emergency_contact || {
          name: '',
          relationship: '',
          phone: '',
          email: ''
        },
        department_id: employeeData.department_id || '',
        position: employeeData.position || '',
        employment_type: employeeData.employment_type || 'full_time',
        status: employeeData.status || 'active',
        hire_date: employeeData.hire_date ? new Date(employeeData.hire_date).toISOString().split('T')[0] : '',
        probation_end_date: employeeData.probation_end_date ? new Date(employeeData.probation_end_date).toISOString().split('T')[0] : ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof FormData] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth) : undefined,
        hire_date: new Date(formData.hire_date),
        probation_end_date: formData.probation_end_date ? new Date(formData.probation_end_date) : undefined
      };

      await employeeApi.updateEmployee(employeeId, updateData);
      router.push(`/dashboard/employees/${employeeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) {
      return;
    }

    try {
      switch (newStatus) {
        case 'terminated':
          const terminationReason = prompt('Please provide a reason for termination:');
          if (terminationReason) {
            await employeeApi.terminateEmployee(employeeId, {
              termination_date: new Date(),
              termination_reason: terminationReason
            });
          }
          break;
        case 'active':
          await employeeApi.activateEmployee(employeeId, 'Status changed to active');
          break;
        case 'suspended':
          const suspensionReason = prompt('Please provide a reason for suspension:');
          if (suspensionReason) {
            await employeeApi.suspendEmployee(employeeId, {
              reason: suspensionReason
            });
          }
          break;
      }
      await loadData(); // Reload data to reflect changes
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to change status to ${newStatus}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Employee not found'}</p>
          <Link href="/dashboard/employees" className="mt-4 inline-block">
            <Button>Back to Employees</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/dashboard/employees/${employeeId}`}>
              <Button variant="outline" size="sm">
                ← Back to Profile
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">
              Edit {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-gray-600 mt-1">Employee #{employee.employee_number}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Status Management */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Current Status</h3>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                employee.status === 'active' ? 'bg-green-100 text-green-800' :
                employee.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                employee.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {employee.status}
              </span>
            </div>
            <div className="flex gap-2">
              {employee.status !== 'active' && (
                <Button 
                  onClick={() => handleStatusChange('active')}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Activate
                </Button>
              )}
              {employee.status !== 'suspended' && employee.status !== 'terminated' && (
                <Button 
                  onClick={() => handleStatusChange('suspended')}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Suspend
                </Button>
              )}
              {employee.status !== 'terminated' && (
                <Button 
                  onClick={() => handleStatusChange('terminated')}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Terminate
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <Input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => handleInputChange('middle_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile
                    </label>
                    <Input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h3 className="text-lg font-medium mb-4">Employment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => handleInputChange('department_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position/Job Title
                    </label>
                    <Input
                      type="text"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employment Type
                    </label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => handleInputChange('employment_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hire Date
                    </label>
                    <Input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => handleInputChange('hire_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Probation End Date
                    </label>
                    <Input
                      type="date"
                      value={formData.probation_end_date}
                      onChange={(e) => handleInputChange('probation_end_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <Link href={`/dashboard/employees/${employeeId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}