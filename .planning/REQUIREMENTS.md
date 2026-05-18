# Requirements for QIU University Management Platform

## Scope

This document outlines the functional and non-functional requirements for the QIU University Management Platform, focusing on the core modules: academic planning, timetabling, examination management, HR, and finance, with AI-assisted automation for Head of Programme and Programme Coordinator roles.

## Functional Requirements

### Academic Planning Module

#### Course Structure Management
- Import and store MQA-approved course structures for all programmes
- Map fixed semester-by-semester plans for every intake cohort
- Validate course structures against MQA standards
- Allow programme coordinators to view and audit course structures
- Prevent modification of approved course structures without formal amendment process

#### Student Academic Plan Management
- Generate individual academic plans for each student based on their intake cohort
- Track student progress through required and elective courses
- Automatically detect academic failures (grades below pass threshold)
- Insert retake subjects into future semesters while preserving graduation timelines
- Enforce credit-hour limits (20 long / 10 short semester; 21 with appeal)
- Generate academic plan audit reports for advisors and administrators

### Timetabling Module

#### Conflict-Free Timetable Generation
- Generate timetables that honour:
  - Room capacity constraints
  - Lecturer availability schedules
  - Student schedule constraints (based on enrolled courses)
  - Prerequisite dependencies between courses
  - Credit-hour limits per semester
- Optimize timetable generation for:
  - Minimal gaps in student schedules
  - Optimal room utilization
  - Lecturer workload balancing
- Support manual timetable adjustments with constraint validation
- Generate timetable conflict reports for review

#### Venue and Resource Management
- Maintain digital campus floor plan with room details (capacity, equipment, accessibility)
- Track real-time room availability and bookings
- Automatically suggest replacement slots when classes are cancelled
- Manage special resources (labs, equipment, specialized spaces)
- Provide venue booking calendar for faculty and staff

### Examination Management Module

#### Exam Scheduling
- Schedule examinations based on course timetables
- Avoid examination timetable conflicts for students
- Allocate appropriate venues based on exam type and student count
- Manage invigilator assignments and schedules
- Generate examination timetables for students and faculty

#### Results Processing
- Capture and store examination results
- Calculate grades based on defined grading schemes
- Generate grade reports and transcripts
- Flag at-risk students based on academic performance
- Provide academic standing calculations

### Human Resources Module

#### Staff Management
- Maintain employee records with roles, qualifications, and contracts
- Manage lecturer availability and teaching assignments
- Track professional development and training records
- Generate HR reports for management and compliance

#### Workload Management
- Calculate teaching workloads based on assigned courses
- Monitor lecturer workload against institutional policies
- Generate workload reports for department heads
- Support workload adjustment requests and approvals

### Finance Module

#### Fee Management
- Store programme fee structures and payment schedules
- Generate invoices for tuition and other fees
- Track payment status and outstanding balances
- Generate financial reports for management
- Interface with existing financial systems

#### Budget Tracking
- Track departmental and programme budgets
- Monitor expenditures against allocated budgets
- Generate budget variance reports
- Support budget planning and forecasting processes

### AI Assistance Features

#### Timetable Generation Assistance
- Pre-generate timetable options using optimization algorithms
- Rank timetable options based on multiple criteria (student satisfaction, room utilization, etc.)
- Flag potential issues in generated timetables for human review
- Learn from historical timetable data to improve future generations

#### At-Risk Student Identification
- Analyze academic performance data to identify at-risk students
- Consider multiple factors: grades, attendance, course progression, etc.
- Generate risk scores and intervention recommendations
- Provide early warning reports to academic advisors

#### Prerequisite-Aware Chatbot
- Answer student queries about course prerequisites and academic pathways
- Provide personalized recommendations based on student's academic record
- Clarify programme requirements and elective options
- Escalate complex queries to human advisors when needed

#### Appeal Pre-Assessment
- Pre-assess appeal cases for academic decisions
- Provide recommendations based on historical data and institutional policies
- Flag appeals requiring special attention
- Generate appeal summary reports for review committees

### Integration and Accessibility

#### Authentication and Authorization
- Implement role-based access control (RBAC) for all modules
- Support multiple user types: students, lecturers, HoP, PC, exam division, HR, finance, administrators
- Provide single sign-on (SSO) capabilities
- Maintain audit trails for all system changes and accesses

#### Cross-Module Integration
- Ensure data consistency across all modules
- Provide real-time updates when data changes in one module affects others
- Generate integrated reports spanning multiple modules
- Support workflow automation across modules

#### Multi-Platform Delivery
- Web application accessible via modern browsers
- Mobile applications for iOS and Android platforms
- Desktop applications for Windows and macOS
- Consistent user experience across all platforms
- Offline capabilities for critical functions where appropriate

## Non-Functional Requirements

### Performance
- Support concurrent users across entire university population (estimated 5,000+ users)
- Page load times under 3 seconds for standard operations
- Report generation completion within reasonable timeframes (<30 seconds for standard reports)
- System availability target of 99.% during business hours

### Scalability
- Horizontal scalability to accommodate growing user base
- Database design supporting partitioning and indexing strategies
- Microservices architecture enabling independent scaling of modules
- Caching strategies for frequently accessed data

### Security
- End-to-end encryption for data in transit and at rest
- Regular security audits and penetration testing
- Compliance with data protection regulations
- Secure authentication mechanisms (multi-factor authentication support)
- Role-based access with principle of least privilege

### Usability
- Intuitive user interface requiring minimal training
- Consistent design language and navigation patterns
- Accessibility compliance (WCAG 2.1 AA)
- Responsive design for various screen sizes
- Multi-language support (English and Malay as required)

### Reliability
- Automated backup and disaster recovery procedures
- Fault-tolerant design with graceful degradation
- Comprehensive logging and monitoring capabilities
- Regular system health checks and alerting

### Maintainability
- Modular, well-documented codebase
- Automated testing suite (unit, integration, end-to-end)
- Clear deployment pipelines and rollback procedures
- Comprehensive API documentation
- Technical debt tracking and management

## Assumptions and Dependencies

### Assumptions
- MQA course structure data will be provided in standardized format
- Existing SIS and financial systems expose necessary APIs for integration
- University stakeholders will participate in requirements validation and user acceptance testing
- Adequate training resources will be available for system adoption
- Budget and resources are allocated for full development lifecycle

### Dependencies
- Integration with existing Student Information System (SIS)
- Integration with existing Financial Management System
- Integration with Learning Management System (LMS) if applicable
- Identity provider for authentication (if existing SSO infrastructure exists)
- Document management system for storing policies and procedures
- Email and notification systems for communications

## Acceptance Criteria

### Module-Level Acceptance
Each module must demonstrate:
- All functional requirements implemented and tested
- Performance benchmarks met under expected load
- Security vulnerabilities addressed through testing
- User acceptance testing passed with representative users
- Documentation completed and training materials prepared

### System-Level Acceptance
The complete system must:
- Successfully integrate all modules with data consistency
- Support end-to-end university operational workflows
- Meet all non-functional requirements
- Receive formal sign-off from university stakeholders
- Be ready for production deployment and training rollout

## Priority Classification

### Must Have (MVP)
- Core academic planning functionality
- Basic timetable generation with constraint checking
- Student and lecturer portal access
- Fundamental HR and finance tracking
- Role-based access control
- Basic reporting capabilities

### Should Have (Phase 2)
- Advanced AI assistance features
- Comprehensive venue and resource management
- Detailed examination management
- Integrated workflow automation
- Advanced analytics and dashboards
- Mobile application release

### Could Have (Phase 3)
- AI-powered predictive analytics
- Advanced optimization algorithms
- Extended integration capabilities
- Enhanced user personalization
- Advanced mobile features (offline sync, push notifications)
- Alumni and advancement module integration

---
*Last updated: 2026-05-18 after requirements gathering*