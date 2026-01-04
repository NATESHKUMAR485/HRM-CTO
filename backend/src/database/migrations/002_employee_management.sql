-- Employee Management Module Tables
-- Enable UUID extension (already enabled in previous migration)

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID,
    budget DECIMAL(15,2),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_department_name_per_tenant UNIQUE(tenant_id, name),
    CONSTRAINT valid_budget CHECK (budget >= 0)
);

-- Create indexes for departments
CREATE INDEX idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);
CREATE INDEX idx_departments_status ON departments(status);

-- Create employees table (main employee records)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    mobile VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(50),
    nationality VARCHAR(100),
    national_id VARCHAR(50),
    passport_number VARCHAR(50),
    address JSONB DEFAULT '{}'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    photo_url TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position VARCHAR(255),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'full_time',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    hire_date DATE NOT NULL,
    probation_end_date DATE,
    termination_date DATE,
    termination_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_number_per_tenant UNIQUE(tenant_id, employee_number),
    CONSTRAINT unique_employee_email_per_tenant UNIQUE(tenant_id, email),
    CONSTRAINT valid_hire_date CHECK (hire_date <= CURRENT_DATE),
    CONSTRAINT valid_probation_end CHECK (probation_end_date >= hire_date),
    CONSTRAINT valid_termination CHECK (
        (termination_date IS NULL AND termination_reason IS NULL) OR
        (termination_date IS NOT NULL AND termination_reason IS NOT NULL)
    ),
    CONSTRAINT valid_termination_date CHECK (
        termination_date IS NULL OR termination_date >= hire_date
    )
);

-- Create indexes for employees
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);
CREATE INDEX idx_employees_name ON employees(first_name, last_name);

-- Create employee_allowances table
CREATE TABLE IF NOT EXISTS employee_allowances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    allowance_type VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
    effective_date DATE NOT NULL,
    end_date DATE,
    is_taxable BOOLEAN DEFAULT true,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK (amount >= 0),
    CONSTRAINT valid_effective_dates CHECK (
        end_date IS NULL OR end_date > effective_date
    )
);

-- Create indexes for employee_allowances
CREATE INDEX idx_employee_allowances_tenant_id ON employee_allowances(tenant_id);
CREATE INDEX idx_employee_allowances_employee_id ON employee_allowances(employee_id);
CREATE INDEX idx_employee_allowances_type ON employee_allowances(allowance_type);
CREATE INDEX idx_employee_allowances_status ON employee_allowances(status);

-- Create employee_deductions table
CREATE TABLE IF NOT EXISTS employee_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    deduction_type VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
    effective_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_deduction_amount CHECK (amount >= 0),
    CONSTRAINT valid_deduction_effective_dates CHECK (
        end_date IS NULL OR end_date > effective_date
    )
);

-- Create indexes for employee_deductions
CREATE INDEX idx_employee_deductions_tenant_id ON employee_deductions(tenant_id);
CREATE INDEX idx_employee_deductions_employee_id ON employee_deductions(employee_id);
CREATE INDEX idx_employee_deductions_type ON employee_deductions(deduction_type);
CREATE INDEX idx_employee_deductions_status ON employee_deductions(status);

-- Create employee_bank_details table (encrypted fields)
CREATE TABLE IF NOT EXISTS employee_bank_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    routing_number VARCHAR(50),
    swift_code VARCHAR(20),
    bank_address JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for employee_bank_details
CREATE INDEX idx_employee_bank_details_tenant_id ON employee_bank_details(tenant_id);
CREATE INDEX idx_employee_bank_details_employee_id ON employee_bank_details(employee_id);
CREATE INDEX idx_employee_bank_details_status ON employee_bank_details(status);

-- Create employee_tax_info table (encrypted fields)
CREATE TABLE IF NOT EXISTS employee_tax_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tax_filing_status VARCHAR(50) NOT NULL,
    tax_id_encrypted TEXT,
    withholding_rate DECIMAL(5,4) DEFAULT 0,
    additional_withholding DECIMAL(15,2) DEFAULT 0,
    dependents_count INTEGER DEFAULT 0,
    tax_exemptions JSONB DEFAULT '[]'::jsonb,
    tax_state VARCHAR(100),
    tax_country VARCHAR(100) NOT NULL DEFAULT 'United States',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_withholding_rate CHECK (withholding_rate >= 0 AND withholding_rate <= 1),
    CONSTRAINT valid_dependents_count CHECK (dependents_count >= 0)
);

-- Create indexes for employee_tax_info
CREATE INDEX idx_employee_tax_info_tenant_id ON employee_tax_info(tenant_id);
CREATE INDEX idx_employee_tax_info_employee_id ON employee_tax_info(employee_id);
CREATE INDEX idx_employee_tax_info_status ON employee_tax_info(status);

-- Create employee_skills table
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    proficiency_level VARCHAR(50) NOT NULL,
    years_of_experience INTEGER DEFAULT 0,
    certification_required BOOLEAN DEFAULT false,
    last_used_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_skill_per_employee UNIQUE(tenant_id, employee_id, skill_name),
    CONSTRAINT valid_proficiency CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    CONSTRAINT valid_years_experience CHECK (years_of_experience >= 0),
    CONSTRAINT valid_last_used_date CHECK (last_used_date IS NULL OR last_used_date <= CURRENT_DATE)
);

-- Create indexes for employee_skills
CREATE INDEX idx_employee_skills_tenant_id ON employee_skills(tenant_id);
CREATE INDEX idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX idx_employee_skills_name ON employee_skills(skill_name);
CREATE INDEX idx_employee_skills_proficiency ON employee_skills(proficiency_level);

-- Create employee_certifications table
CREATE TABLE IF NOT EXISTS employee_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    certificate_number VARCHAR(100),
    issue_date DATE NOT NULL,
    expiry_date DATE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    document_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_certification_dates CHECK (expiry_date IS NULL OR expiry_date > issue_date),
    CONSTRAINT valid_issue_date CHECK (issue_date <= CURRENT_DATE)
);

-- Create indexes for employee_certifications
CREATE INDEX idx_employee_certifications_tenant_id ON employee_certifications(tenant_id);
CREATE INDEX idx_employee_certifications_employee_id ON employee_certifications(employee_id);
CREATE INDEX idx_employee_certifications_name ON employee_certifications(certification_name);
CREATE INDEX idx_employee_certifications_expiry ON employee_certifications(expiry_date);
CREATE INDEX idx_employee_certifications_status ON employee_certifications(status);

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_file_size CHECK (file_size > 0),
    CONSTRAINT valid_version CHECK (version > 0)
);

-- Create indexes for employee_documents
CREATE INDEX idx_employee_documents_tenant_id ON employee_documents(tenant_id);
CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_latest_version ON employee_documents(is_latest_version);
CREATE INDEX idx_employee_documents_status ON employee_documents(status);

-- Create employee_benefits table
CREATE TABLE IF NOT EXISTS employee_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    benefit_type VARCHAR(100) NOT NULL,
    benefit_name VARCHAR(255) NOT NULL,
    provider VARCHAR(255),
    plan_details JSONB DEFAULT '{}'::jsonb,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE,
    employee_contribution DECIMAL(15,2) DEFAULT 0,
    employer_contribution DECIMAL(15,2) DEFAULT 0,
    enrollment_status VARCHAR(50) NOT NULL DEFAULT 'enrolled',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_employee_contribution CHECK (employee_contribution >= 0),
    CONSTRAINT positive_employer_contribution CHECK (employer_contribution >= 0),
    CONSTRAINT valid_benefit_dates CHECK (
        coverage_end_date IS NULL OR coverage_end_date > coverage_start_date
    )
);

-- Create indexes for employee_benefits
CREATE INDEX idx_employee_benefits_tenant_id ON employee_benefits(tenant_id);
CREATE INDEX idx_employee_benefits_employee_id ON employee_benefits(employee_id);
CREATE INDEX idx_employee_benefits_type ON employee_benefits(benefit_type);
CREATE INDEX idx_employee_benefits_enrollment_status ON employee_benefits(enrollment_status);
CREATE INDEX idx_employee_benefits_status ON employee_benefits(status);

-- Create employee_salary_history table
CREATE TABLE IF NOT EXISTS employee_salary_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    base_salary DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    effective_date DATE NOT NULL,
    end_date DATE,
    change_reason VARCHAR(255),
    change_type VARCHAR(50) NOT NULL DEFAULT 'increase',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_date DATE,
    approval_notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_base_salary CHECK (base_salary > 0),
    CONSTRAINT valid_salary_effective_dates CHECK (
        end_date IS NULL OR end_date > effective_date
    )
);

-- Create indexes for employee_salary_history
CREATE INDEX idx_employee_salary_history_tenant_id ON employee_salary_history(tenant_id);
CREATE INDEX idx_employee_salary_history_employee_id ON employee_salary_history(employee_id);
CREATE INDEX idx_employee_salary_history_effective_date ON employee_salary_history(effective_date);
CREATE INDEX idx_employee_salary_history_status ON employee_salary_history(status);

-- Create employee_employment_history table
CREATE TABLE IF NOT EXISTS employee_employment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    previous_value JSONB DEFAULT '{}'::jsonb,
    new_value JSONB DEFAULT '{}'::jsonb,
    reason TEXT,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_date DATE,
    approval_notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_event_date CHECK (event_date <= CURRENT_DATE)
);

-- Create indexes for employee_employment_history
CREATE INDEX idx_employee_employment_history_tenant_id ON employee_employment_history(tenant_id);
CREATE INDEX idx_employee_employment_history_employee_id ON employee_employment_history(employee_id);
CREATE INDEX idx_employee_employment_history_event_type ON employee_employment_history(event_type);
CREATE INDEX idx_employee_employment_history_event_date ON employee_employment_history(event_date);
CREATE INDEX idx_employee_employment_history_status ON employee_employment_history(status);

-- Create employee_audit_logs table
CREATE TABLE IF NOT EXISTS employee_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for employee_audit_logs
CREATE INDEX idx_employee_audit_logs_tenant_id ON employee_audit_logs(tenant_id);
CREATE INDEX idx_employee_audit_logs_employee_id ON employee_audit_logs(employee_id);
CREATE INDEX idx_employee_audit_logs_action ON employee_audit_logs(action);
CREATE INDEX idx_employee_audit_logs_entity_type ON employee_audit_logs(entity_type);
CREATE INDEX idx_employee_audit_logs_created_at ON employee_audit_logs(created_at);

-- Add foreign key constraints for department.manager_id to employees
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_manager_id 
FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Create function to generate employee number
CREATE OR REPLACE FUNCTION generate_employee_number(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_prefix TEXT;
    current_year TEXT;
    sequence_number TEXT;
    final_number TEXT;
BEGIN
    -- Get first 3 characters of company name for prefix
    SELECT SUBSTRING(name, 1, 3) INTO company_prefix 
    FROM tenants WHERE id = tenant_uuid;
    
    -- Get current year
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(employee_number FROM '\d+$') AS INTEGER)
    ), 0) + 1 INTO sequence_number
    FROM employees 
    WHERE tenant_id = tenant_uuid 
    AND employee_number LIKE company_prefix || current_year || '%';
    
    -- Format final employee number: ABC20240001
    final_number := company_prefix || current_year || LPAD(sequence_number::TEXT, 4, '0');
    
    RETURN final_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to check for expiring certifications
CREATE OR REPLACE FUNCTION check_expiring_certifications()
RETURNS TABLE(
    employee_id UUID,
    employee_name TEXT,
    certification_name TEXT,
    expiry_date DATE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        ec.certification_name,
        ec.expiry_date,
        (ec.expiry_date - CURRENT_DATE) as days_until_expiry
    FROM employee_certifications ec
    JOIN employees e ON e.id = ec.employee_id
    WHERE ec.expiry_date IS NOT NULL
    AND ec.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    AND ec.expiry_date >= CURRENT_DATE
    AND ec.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Update updated_at triggers for new tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_allowances_updated_at BEFORE UPDATE ON employee_allowances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at BEFORE UPDATE ON employee_deductions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_bank_details_updated_at BEFORE UPDATE ON employee_bank_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_tax_info_updated_at BEFORE UPDATE ON employee_tax_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at BEFORE UPDATE ON employee_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_certifications_updated_at BEFORE UPDATE ON employee_certifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON employee_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_benefits_updated_at BEFORE UPDATE ON employee_benefits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_salary_history_updated_at BEFORE UPDATE ON employee_salary_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_employment_history_updated_at BEFORE UPDATE ON employee_employment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();