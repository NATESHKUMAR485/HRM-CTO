'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {user?.first_name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here&apos;s an overview of your HR management system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Employees</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Leaves</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <div className="text-4xl">📅</div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payroll Status</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">✓</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
                <div className="text-2xl mb-2">➕</div>
                <p className="font-medium text-gray-900">Add Employee</p>
                <p className="text-sm text-gray-600">Add a new team member</p>
              </button>

              <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
                <div className="text-2xl mb-2">💵</div>
                <p className="font-medium text-gray-900">Process Payroll</p>
                <p className="text-sm text-gray-600">Run payroll for this month</p>
              </button>

              <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
                <div className="text-2xl mb-2">📊</div>
                <p className="font-medium text-gray-900">View Reports</p>
                <p className="text-sm text-gray-600">Generate HR reports</p>
              </button>

              <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors">
                <div className="text-2xl mb-2">⚙️</div>
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-sm text-gray-600">Configure your workspace</p>
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium capitalize">{user?.status}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Member Since:</span>
                <span className="font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
