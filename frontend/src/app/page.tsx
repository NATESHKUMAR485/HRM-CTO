import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-blue-600">HRM SaaS</h1>
            <div className="space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Enterprise HR Management<br />Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Powerful, scalable HRM SaaS platform with multi-tenant architecture.
            Manage employees, payroll, attendance, and more.
          </p>
          <div className="space-x-4">
            <Link href="/auth/register">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg">Login to Your Account</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Employee Management</h3>
            <p className="text-gray-600">
              Comprehensive employee database with detailed profiles and document management.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">Payroll & Compensation</h3>
            <p className="text-gray-600">
              Automated payroll processing with tax calculations and compliance management.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Leave & Attendance</h3>
            <p className="text-gray-600">
              Track attendance, manage leave requests, and generate detailed reports.
            </p>
          </div>
        </div>

        <div className="mt-20 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Multi-Tenant Architecture</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3">🔒 Secure & Isolated</h3>
              <p className="text-gray-600">
                Each company gets their own isolated environment with complete data security.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">⚡ High Performance</h3>
              <p className="text-gray-600">
                Built with modern technology stack for speed and scalability.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">🎨 Customizable</h3>
              <p className="text-gray-600">
                Customize branding, features, and workflows to match your needs.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3">📊 Analytics & Reporting</h3>
              <p className="text-gray-600">
                Comprehensive reporting and analytics for data-driven decisions.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 HRM SaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
