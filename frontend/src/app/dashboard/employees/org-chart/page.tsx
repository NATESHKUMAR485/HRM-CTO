'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/api/employee';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface OrgChartNode {
  id: string;
  name: string;
  description: string;
  manager_id?: string;
  level: number;
  path: string;
  employee_count: number;
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    position?: string;
    email: string;
    status: string;
  }>;
}

export default function OrganizationChartPage() {
  const [orgChart, setOrgChart] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrganizationChart();
  }, []);

  const loadOrganizationChart = async () => {
    try {
      setLoading(true);
      const data = await employeeApi.getOrganizationChart();
      setOrgChart(data);
      
      // Expand first level by default
      const firstLevelNodes = data.filter(node => node.level === 0);
      const expanded = new Set(firstLevelNodes.map(node => node.id));
      setExpandedNodes(expanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization chart');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeStyle = (level: number) => {
    const baseClasses = "border rounded-lg p-4 mb-4 transition-all duration-200";
    const levelClasses = [
      "bg-blue-50 border-blue-200", // Level 0 - Root
      "bg-green-50 border-green-200", // Level 1
      "bg-yellow-50 border-yellow-200", // Level 2
      "bg-purple-50 border-purple-200", // Level 3+
    ];
    return `${baseClasses} ${levelClasses[Math.min(level, 3)]}`;
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

  const renderOrgChart = (nodes: OrgChartNode[], parentId?: string) => {
    const filteredNodes = parentId 
      ? nodes.filter(node => node.manager_id === parentId)
      : nodes.filter(node => !node.manager_id);

    return filteredNodes.map(node => (
      <div key={node.id} className="ml-0">
        <div className={getNodeStyle(node.level)}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {node.level > 0 && (
                  <button
                    onClick={() => toggleNode(node.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {expandedNodes.has(node.id) ? '▼' : '▶'}
                  </button>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{node.name}</h3>
                <span className="text-sm text-gray-500">
                  ({node.employee_count} employees)
                </span>
              </div>
              {node.description && (
                <p className="text-sm text-gray-600 mt-1">{node.description}</p>
              )}
              
              {/* Department Employees */}
              {node.employees && node.employees.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members:</h4>
                  <div className="flex flex-wrap gap-2">
                    {node.employees.slice(0, 5).map(employee => (
                      <Link
                        key={employee.id}
                        href={`/dashboard/employees/${employee.id}`}
                        className="inline-flex items-center px-2 py-1 bg-white border rounded-md text-xs hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-1">
                          <span className="text-xs font-medium">
                            {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-gray-700">
                          {employee.first_name} {employee.last_name}
                        </span>
                        <span className="text-gray-500 ml-1">({employee.position || 'N/A'})</span>
                      </Link>
                    ))}
                    {node.employees.length > 5 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{node.employees.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/departments/${node.id}`}>
                <Button size="sm" variant="outline">
                  Manage
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {expandedNodes.has(node.id) && (
          <div className="ml-6 border-l-2 border-gray-200 pl-4">
            {renderOrgChart(nodes, node.id)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organization chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
            <p className="text-gray-600 mt-1">View your company's organizational structure</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/departments">
              <Button variant="outline">Manage Departments</Button>
            </Link>
            <Button className="bg-blue-600 hover:bg-blue-700">Export Chart</Button>
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

        {/* Organization Chart */}
        <Card className="p-6">
          {orgChart.length > 0 ? (
            <div className="space-y-4">
              {renderOrgChart(orgChart)}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714M34 40v-4a9.971 9.971 0 01-.712-3.714" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No organization structure</h3>
              <p className="mt-1 text-sm text-gray-500">Create departments to build your organization chart.</p>
              <div className="mt-6">
                <Link href="/dashboard/departments">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Create Department
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Statistics */}
        {orgChart.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">{orgChart.length}</div>
              <div className="text-sm text-gray-600">Total Departments</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {orgChart.reduce((sum, dept) => sum + dept.employee_count, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {orgChart.filter(dept => dept.level === 0).length}
              </div>
              <div className="text-sm text-gray-600">Top Level Departments</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...orgChart.map(dept => dept.level), 0) + 1}
              </div>
              <div className="text-sm text-gray-600">Organization Levels</div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}