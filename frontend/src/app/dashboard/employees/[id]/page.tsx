'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { employeeApi } from '@/lib/api/employee';
import { Employee, EmployeeSkill, EmployeeCertification, EmployeeDocument, EmployeeBenefit } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface TabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Tab({ active, onClick, children }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [certifications, setCertifications] = useState<EmployeeCertification[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [benefits, setBenefits] = useState<EmployeeBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const [employeeData, skillsData, certsData, docsData, benefitsData] = await Promise.all([
        employeeApi.getEmployee(employeeId),
        employeeApi.getSkills(employeeId),
        employeeApi.getCertifications(employeeId),
        employeeApi.getDocuments(employeeId),
        employeeApi.getBenefits(employeeId)
      ]);
      
      setEmployee(employeeData);
      setSkills(skillsData);
      setCertifications(certsData);
      setDocuments(docsData);
      setBenefits(benefitsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'full_time':
        return 'bg-blue-100 text-blue-800';
      case 'part_time':
        return 'bg-purple-100 text-purple-800';
      case 'contract':
        return 'bg-orange-100 text-orange-800';
      case 'intern':
        return 'bg-yellow-100 text-yellow-800';
      case 'consultant':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee profile...</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/employees">
              <Button variant="outline" size="sm">
                ← Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-gray-600">{employee.position || 'No position set'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/employees/${employee.id}/edit`}>
              <Button variant="outline">Edit Employee</Button>
            </Link>
            <Button className="bg-blue-600 hover:bg-blue-700">Export Profile</Button>
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

        {/* Employee Header Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    alt={`${employee.first_name} ${employee.last_name}`}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-2xl font-medium text-gray-700">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  <span className="text-sm text-gray-500">Employee Number</span>
                  <p className="font-medium">{employee.employee_number}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="font-medium">{employee.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Department</span>
                  <p className="font-medium">{employee.department_name || 'Not assigned'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Employment Type</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEmploymentTypeColor(employee.employment_type)}`}>
                    {employee.employment_type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(employee.status)}`}>
                    {employee.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Hire Date</span>
                  <p className="font-medium">{new Date(employee.hire_date).toLocaleDateString()}</p>
                </div>
                {employee.phone && (
                  <div>
                    <span className="text-sm text-gray-500">Phone</span>
                    <p className="font-medium">{employee.phone}</p>
                  </div>
                )}
                {employee.mobile && (
                  <div>
                    <span className="text-sm text-gray-500">Mobile</span>
                    <p className="font-medium">{employee.mobile}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <Tab active={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
              Personal Info
            </Tab>
            <Tab active={activeTab === 'employment'} onClick={() => setActiveTab('employment')}>
              Employment
            </Tab>
            <Tab active={activeTab === 'compensation'} onClick={() => setActiveTab('compensation')}>
              Compensation
            </Tab>
            <Tab active={activeTab === 'skills'} onClick={() => setActiveTab('skills')}>
              Skills & Certifications
            </Tab>
            <Tab active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
              Documents
            </Tab>
            <Tab active={activeTab === 'benefits'} onClick={() => setActiveTab('benefits')}>
              Benefits
            </Tab>
            <Tab active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
              History
            </Tab>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'personal' && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="text-sm text-gray-500">First Name</label>
                  <p className="font-medium">{employee.first_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Last Name</label>
                  <p className="font-medium">{employee.last_name}</p>
                </div>
                {employee.middle_name && (
                  <div>
                    <label className="text-sm text-gray-500">Middle Name</label>
                    <p className="font-medium">{employee.middle_name}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Date of Birth</label>
                  <p className="font-medium">
                    {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Gender</label>
                  <p className="font-medium">{employee.gender || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Marital Status</label>
                  <p className="font-medium">{employee.marital_status || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Nationality</label>
                  <p className="font-medium">{employee.nationality || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">National ID</label>
                  <p className="font-medium">{employee.national_id || 'Not provided'}</p>
                </div>
              </div>
              
              {employee.address && (
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-2">Address</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <p>{employee.address.street}</p>
                    <p>
                      {employee.address.city}, {employee.address.state} {employee.address.zip_code}
                    </p>
                    <p>{employee.address.country}</p>
                  </div>
                </div>
              )}
              
              {employee.emergency_contact && (
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-2">Emergency Contact</h4>
                  <div className="bg-gray-50 p-4 rounded">
                    <p><strong>Name:</strong> {employee.emergency_contact.name}</p>
                    <p><strong>Relationship:</strong> {employee.emergency_contact.relationship}</p>
                    <p><strong>Phone:</strong> {employee.emergency_contact.phone}</p>
                    <p><strong>Email:</strong> {employee.emergency_contact.email}</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Skills</h3>
                  <Button size="sm">Add Skill</Button>
                </div>
                {skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skills.map((skill) => (
                      <div key={skill.id} className="border p-4 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{skill.skill_name}</h4>
                            <p className="text-sm text-gray-600 capitalize">{skill.proficiency_level}</p>
                            {skill.years_of_experience > 0 && (
                              <p className="text-sm text-gray-500">{skill.years_of_experience} years experience</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">Edit</Button>
                            <Button size="sm" variant="outline" className="text-red-600">Delete</Button>
                          </div>
                        </div>
                        {skill.notes && (
                          <p className="text-sm text-gray-600 mt-2">{skill.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No skills added yet</p>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Certifications</h3>
                  <Button size="sm">Add Certification</Button>
                </div>
                {certifications.length > 0 ? (
                  <div className="space-y-4">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="border p-4 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{cert.certification_name}</h4>
                            <p className="text-sm text-gray-600">{cert.issuing_organization}</p>
                            <p className="text-sm text-gray-500">
                              Issued: {new Date(cert.issue_date).toLocaleDateString()}
                              {cert.expiry_date && (
                                <span className="ml-2">
                                  • Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              cert.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                              cert.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cert.verification_status}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">Edit</Button>
                            <Button size="sm" variant="outline" className="text-red-600">Delete</Button>
                          </div>
                        </div>
                        {cert.certificate_number && (
                          <p className="text-sm text-gray-600 mt-2">
                            Certificate #: {cert.certificate_number}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No certifications added yet</p>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'documents' && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Documents</h3>
                <Button size="sm">Upload Document</Button>
              </div>
              {documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Document Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">File Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Version</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Uploaded</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-2 text-sm">{doc.document_type}</td>
                          <td className="px-4 py-2 text-sm">{doc.file_name}</td>
                          <td className="px-4 py-2 text-sm">v{doc.version}</td>
                          <td className="px-4 py-2 text-sm">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline">Download</Button>
                              <Button size="sm" variant="outline" className="text-red-600">Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
              )}
            </Card>
          )}

          {activeTab === 'benefits' && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Benefits</h3>
                <Button size="sm">Add Benefit</Button>
              </div>
              {benefits.length > 0 ? (
                <div className="space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit.id} className="border p-4 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{benefit.benefit_name}</h4>
                          <p className="text-sm text-gray-600">{benefit.benefit_type}</p>
                          {benefit.provider && (
                            <p className="text-sm text-gray-500">Provider: {benefit.provider}</p>
                          )}
                          <p className="text-sm text-gray-500">
                            Coverage: {new Date(benefit.coverage_start_date).toLocaleDateString()}
                            {benefit.coverage_end_date && (
                              <span> - {new Date(benefit.coverage_end_date).toLocaleDateString()}</span>
                            )}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            benefit.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' :
                            benefit.enrollment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {benefit.enrollment_status}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">Edit</Button>
                          <Button size="sm" variant="outline" className="text-red-600">Remove</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No benefits assigned yet</p>
              )}
            </Card>
          )}

          {activeTab === 'compensation' && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Compensation Details</h3>
              <p className="text-gray-500">Compensation information will be displayed here</p>
              <Button className="mt-4">View Salary History</Button>
            </Card>
          )}

          {activeTab === 'employment' && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Employment History</h3>
              <p className="text-gray-500">Employment history and changes will be displayed here</p>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Audit Log</h3>
              <p className="text-gray-500">Complete audit trail of changes will be displayed here</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}