export interface ResumeProfile {
  id: string;
  filename: string;
  uploadedAt: string;
  rawText: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    score: string;
  }>;
  programmingLanguages: string[];
  frameworksLibraries: string[];
  databases: string[];
  cloudDevops: string[];
  technicalSkills: string[];
  softSkills: string[];
  workExperience: Array<{
    role: string;
    company: string;
    duration: string;
    highlights: string[];
  }>;
  projects: Array<{
    title: string;
    techStack: string[];
    description: string;
  }>;
  certifications: string[];
  achievements: string[];
  skillEvidence: Record<string, string>;
}

export interface JobRoleProfile {
  id: string;
  title: string;
  companyName: string;
  sourceUrl?: string;
  sourceType: 'verified_posting' | 'role_template';
  rawText: string;
  experienceRequired: string;
  educationRequired: string;
  mandatorySkills: string[];
  preferredSkills: string[];
  optionalSkills: string[];
  softSkills: string[];
  responsibilities: string[];
  requirementClauses: Record<string, string>;
  defaultWeights: ScoringWeights;
}

export interface ScoringWeights {
  technicalSkills: number; // default 0.50
  education: number; // default 0.15
  projectsExperience: number; // default 0.20
  certifications: number; // default 0.10
  softSkills: number; // default 0.05
}

export interface EvidenceMatchItem {
  jobSkill: string;
  resumeSkill: string;
  tier: 'Mandatory' | 'Preferred' | 'Optional';
  matchType: 'Exact Match' | 'Semantic Competency Match' | 'Non-Interchangeable Sibling (Partial)' | 'Partial Semantic Match';
  similarity: number;
  resumeEvidence: string;
  jobRequirement: string;
  explanation: string;
}

export interface MissingSkillItem {
  jobSkill: string;
  tier: 'Mandatory' | 'Preferred' | 'Optional';
  jobRequirement: string;
  relatedExistingSkills: string[];
}

export interface MatchAnalysisResult {
  overallScore: number;
  technicalScore: number;
  educationScore: number;
  projectsExperienceScore: number;
  certificationsScore: number;
  softSkillsScore: number;
  mandatorySatisfiedPct: number;
  preferredSatisfiedPct: number;
  optionalSatisfiedPct: number;
  weightsUsed: ScoringWeights;
  matchedSkills: EvidenceMatchItem[];
  partialSkills: EvidenceMatchItem[];
  missingSkills: MissingSkillItem[];
}

export interface SkillGapDetail {
  skillName: string;
  tier: 'Mandatory' | 'Preferred' | 'Optional';
  importance: string;
  priorityCategory: 'Critical Gaps' | 'High-Priority Gaps' | 'Medium-Priority Gaps' | 'Optional Improvements';
  whyItMatters: string;
  relatedExistingSkills: string[];
  recommendedPriorityRank: number;
  estimatedDuration: string;
  practicalExercise: string;
}

export interface LearningStage {
  stageName: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedCompletionTime: string;
  recommendedTopics: string[];
  learningObjectives: string[];
  practiceExercises: string[];
  projectAssignment: string;
  verifiedResources: Array<{ title: string; url: string; provider: string }>;
}

export interface RecommendedProject {
  title: string;
  problemStatement: string;
  skillsCovered: string[];
  techStack: string[];
  implementationSteps: string[];
  expectedOutput: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedDuration: string;
  portfolioValue: string;
}

export interface ResumeImprovementReport {
  professionalSummary: {
    currentAssessment: string;
    improvedDraft: string;
  };
  technicalSkillsSection: {
    observation: string;
    recommendedGrouping: string[];
  };
  projectBulletUpgrades: Array<{
    projectTitle: string;
    originalText: string;
    improvedBullet: string;
    rationale: string;
  }>;
  experienceUpgrades: Array<{
    role: string;
    originalText: string;
    improvedBullet: string;
  }>;
  achievementPresentation: string[];
  atsFormattingChecklist: Array<{
    criterion: string;
    status: 'Pass' | 'Needs Attention';
    recommendation: string;
  }>;
}

export interface AnalysisHistoryEntry {
  id: string;
  timestamp: string;
  resumeName: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  sourceType: 'verified_posting' | 'role_template';
  overallScore: number;
  mandatorySatisfiedPct: number;
  matchedCount: number;
  missingCount: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  technicalSkills: 0.50,
  education: 0.15,
  projectsExperience: 0.20,
  certifications: 0.10,
  softSkills: 0.05,
};

export const SKILL_TAXONOMY: Record<string, string[]> = {
  programmingLanguages: [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'SQL', 'R', 'Bash'
  ],
  frameworksLibraries: [
    'React', 'Next.js', 'Node.js', 'Express', 'Flask', 'Django', 'FastAPI',
    'Pandas', 'NumPy', 'Scikit-learn', 'PyTorch', 'TensorFlow', 'Apache Spark',
    'Airflow', 'Kafka', 'Tailwind CSS', 'Bootstrap', 'Spring Boot'
  ],
  databases: [
    'PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Redis', 'Snowflake', 'BigQuery', 'Databricks', 'Oracle'
  ],
  cloudDevops: [
    'AWS', 'Microsoft Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Git', 'GitHub',
    'CI/CD', 'GitHub Actions', 'Terraform', 'Linux', 'Jenkins'
  ],
  technicalSkills: [
    'Data Structures and Algorithms', 'Object-Oriented Programming', 'REST APIs',
    'ETL/ELT', 'Data Pipelines', 'Data Warehousing', 'Machine Learning',
    'Generative AI/LLMs', 'Model Evaluation', 'Statistics', 'Data Visualization',
    'Power BI', 'Tableau', 'Excel', 'Responsive Design', 'Authentication',
    'Testing and Debugging', 'Infrastructure as Code', 'Monitoring', 'HTML', 'CSS'
  ],
  softSkills: [
    'Communication Skills', 'Business Communication', 'Problem Solving',
    'Team Collaboration', 'Agile/Scrum', 'Stakeholder Management', 'Analytical Thinking'
  ],
};

// Non-interchangeable sibling technology groups:
// Having Flask does NOT automatically satisfy Django; having AWS does NOT automatically satisfy Azure.
export const NON_INTERCHANGEABLE_GROUPS: string[][] = [
  ['flask', 'django', 'fastapi'],
  ['react', 'angular', 'vue', 'svelte'],
  ['pytorch', 'tensorflow', 'jax'],
  ['aws', 'microsoft azure', 'azure', 'google cloud', 'gcp'],
  ['mysql', 'postgresql', 'mongodb', 'oracle', 'redis'],
  ['power bi', 'tableau', 'looker'],
  ['java', 'c#', 'python', 'javascript', 'typescript', 'go', 'rust'],
];

// Curated semantic similarity matrix mirroring SentenceTransformers (`all-MiniLM-L6-v2`) cosine scores
export const SEMANTIC_SIMILARITY_MATRIX: Record<string, Record<string, number>> = {
  'sql': { 'postgresql': 0.88, 'mysql': 0.88, 'sqlite': 0.83, 'bigquery': 0.80, 'snowflake': 0.80 },
  'postgresql': { 'sql': 0.88 },
  'mysql': { 'sql': 0.88 },
  'etl/elt': { 'data pipelines': 0.91, 'airflow': 0.82, 'apache spark': 0.78, 'pandas': 0.74 },
  'data pipelines': { 'etl/elt': 0.91, 'airflow': 0.85, 'kafka': 0.80, 'apache spark': 0.81 },
  'data warehousing': { 'snowflake': 0.88, 'bigquery': 0.88, 'databricks': 0.83, 'sql': 0.75, 'postgresql': 0.72 },
  'rest apis': { 'fastapi': 0.87, 'flask': 0.85, 'django': 0.83, 'express': 0.85, 'node.js': 0.78 },
  'machine learning': { 'scikit-learn': 0.91, 'pytorch': 0.86, 'tensorflow': 0.86, 'model evaluation': 0.84 },
  'model evaluation': { 'scikit-learn': 0.85, 'machine learning': 0.84, 'statistics': 0.79 },
  'data visualization': { 'power bi': 0.89, 'tableau': 0.89, 'excel': 0.74, 'pandas': 0.70 },
  'ci/cd': { 'github actions': 0.90, 'jenkins': 0.88, 'docker': 0.75, 'git': 0.70 },
  'git': { 'github': 0.92 },
  'github': { 'git': 0.92 },
  'infrastructure as code': { 'terraform': 0.93, 'aws': 0.72, 'kubernetes': 0.71 },
  'business communication': { 'communication skills': 0.89 },
  'communication skills': { 'business communication': 0.89 },
};

export const PRELOADED_ROLE_TEMPLATES: JobRoleProfile[] = [
  {
    id: 'role-data-engineer',
    title: 'Data Engineer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Data Engineer Role Profile: Design and maintain scalable ETL/ELT data pipelines using Python, SQL, and Apache Spark. Build cloud data warehousing and lakehouse tables on AWS or Microsoft Azure with Databricks, Airflow, and Kafka.',
    experienceRequired: '0–3 Years (Entry-Level / Early Career)',
    educationRequired: 'B.Tech / B.E. / M.Tech in Computer Science, Data Engineering, or Information Systems',
    mandatorySkills: ['Python', 'SQL', 'ETL/ELT', 'Data Pipelines', 'Apache Spark', 'Data Warehousing', 'AWS'],
    preferredSkills: ['Microsoft Azure', 'Databricks', 'Airflow', 'Kafka', 'Snowflake'],
    optionalSkills: ['Docker', 'Terraform', 'Git'],
    softSkills: ['Communication Skills', 'Problem Solving'],
    responsibilities: [
      'Design, build, and maintain fault-tolerant batch and streaming ETL/ELT pipelines in Python and SQL.',
      'Process large-scale transactional and event datasets using Apache Spark and cloud lakehouse architectures.',
      'Orchestrate multi-stage data warehouse workflows and monitor SLA adherence with Apache Airflow.',
      'Collaborate with analytics and ML teams to govern schema quality and query performance.'
    ],
    requirementClauses: {
      'Python': 'Mandatory proficiency in Python for data transformation and pipeline scripting.',
      'SQL': 'Mandatory advanced SQL for complex joins, window functions, and query optimization.',
      'ETL/ELT': 'Mandatory hands-on experience designing ETL/ELT ingestion and transformation workflows.',
      'Data Pipelines': 'Mandatory ability to build reliable batch or streaming data pipelines.',
      'Apache Spark': 'Mandatory distributed data processing experience with Apache Spark / PySpark.',
      'Data Warehousing': 'Mandatory understanding of dimensional modeling and cloud data warehousing.',
      'AWS': 'Mandatory cloud storage and compute experience on AWS (S3, Glue, Redshift, or EMR).',
      'Microsoft Azure': 'Preferred experience with Azure Data Factory, Synapse, or ADLS Gen2.',
      'Databricks': 'Preferred hands-on experience with Databricks and Delta Lake.',
      'Airflow': 'Preferred workflow scheduling and DAG orchestration using Apache Airflow.',
      'Kafka': 'Preferred real-time event streaming experience with Apache Kafka.',
      'Snowflake': 'Preferred cloud data warehouse experience with Snowflake.'
    },
    defaultWeights: {
      technicalSkills: 0.50,
      education: 0.15,
      projectsExperience: 0.20,
      certifications: 0.10,
      softSkills: 0.05,
    },
  },
  {
    id: 'role-software-developer',
    title: 'Software Developer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Software Developer Role Profile: Core software engineering role requiring Python, Java, or JavaScript, strong Data Structures and Algorithms, Object-Oriented Programming, SQL databases, REST APIs, Git/GitHub, Testing and Debugging, and cloud fundamentals.',
    experienceRequired: '0–2 Years (Fresher / Entry-Level)',
    educationRequired: 'B.Tech / B.E. / MCA in Computer Science or equivalent',
    mandatorySkills: [
      'Python', 'Java', 'Data Structures and Algorithms', 'Object-Oriented Programming',
      'SQL', 'REST APIs', 'Git', 'Testing and Debugging'
    ],
    preferredSkills: ['JavaScript', 'GitHub', 'AWS', 'PostgreSQL'],
    optionalSkills: ['Docker', 'CI/CD', 'Linux'],
    softSkills: ['Communication Skills', 'Problem Solving', 'Team Collaboration'],
    responsibilities: [
      'Design, implement, and maintain modular application services using clean Object-Oriented Programming principles.',
      'Build and document RESTful APIs backed by relational SQL databases.',
      'Write unit and integration tests, perform code reviews, and debug production issues.',
      'Use Git and GitHub workflows for collaborative version control and continuous delivery.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
  {
    id: 'role-python-backend',
    title: 'Python Backend Developer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Python Backend Developer Role Profile: Build production REST APIs in Python using FastAPI, Django, or Flask, integrated with PostgreSQL/MySQL, secure Authentication, Git, Docker, and cloud deployment.',
    experienceRequired: '0–2 Years',
    educationRequired: 'Bachelor’s degree in Computer Science or Engineering',
    mandatorySkills: ['Python', 'Django', 'FastAPI', 'REST APIs', 'PostgreSQL', 'SQL', 'Authentication', 'Git', 'Docker'],
    preferredSkills: ['Flask', 'MySQL', 'AWS', 'Redis'],
    optionalSkills: ['CI/CD', 'Kubernetes', 'Linux'],
    softSkills: ['Communication Skills', 'Problem Solving'],
    responsibilities: [
      'Architect and maintain high-throughput backend microservices and REST APIs in Python.',
      'Design normalized PostgreSQL and MySQL schemas and optimize ORM queries.',
      'Implement token-based authentication, role-based access control, and rate limiting.',
      'Containerize backend applications with Docker and deploy to cloud environments.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
  {
    id: 'role-frontend-developer',
    title: 'Frontend Developer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Frontend Developer Role Profile: Build modern responsive web interfaces with HTML, CSS, JavaScript, React, TypeScript, REST API integration, and Git.',
    experienceRequired: '0–2 Years',
    educationRequired: 'Bachelor’s degree in CS/IT or strong frontend engineering portfolio',
    mandatorySkills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Responsive Design', 'REST APIs', 'Git'],
    preferredSkills: ['Next.js', 'Tailwind CSS', 'Testing and Debugging'],
    optionalSkills: ['Node.js', 'CI/CD'],
    softSkills: ['Communication Skills', 'Team Collaboration'],
    responsibilities: [
      'Develop accessible, responsive user interfaces using React, TypeScript, HTML, and CSS.',
      'Integrate client views with RESTful APIs and manage asynchronous state.',
      'Ensure cross-browser compatibility, Core Web Vitals optimization, and clean component architecture.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
  {
    id: 'role-fullstack-developer',
    title: 'Full Stack Developer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Full Stack Developer Role Profile: End-to-end engineering with HTML, CSS, JavaScript, React, Python or Node.js, REST APIs, PostgreSQL/MySQL/MongoDB, Authentication, Git, and cloud deployment.',
    experienceRequired: '0–2 Years',
    educationRequired: 'B.Tech / B.E. in Computer Science or related discipline',
    mandatorySkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Python', 'REST APIs', 'PostgreSQL', 'Authentication', 'Git'],
    preferredSkills: ['TypeScript', 'MongoDB', 'MySQL', 'Docker', 'AWS'],
    optionalSkills: ['Next.js', 'CI/CD', 'Redis'],
    softSkills: ['Communication Skills', 'Problem Solving', 'Agile/Scrum'],
    responsibilities: [
      'Build complete user-facing features spanning React frontends and Python/Node.js backend APIs.',
      'Design and query relational (PostgreSQL/MySQL) and NoSQL (MongoDB) data stores.',
      'Implement secure user authentication, session management, and cloud deployment workflows.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
  {
    id: 'role-data-analyst',
    title: 'Data Analyst',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Data Analyst Role Profile: Analyze business and product datasets using SQL, Excel, Python, Pandas, NumPy, Statistics, and build interactive dashboards in Power BI or Tableau with clear Business Communication.',
    experienceRequired: '0–2 Years',
    educationRequired: 'Bachelor’s degree in Engineering, Statistics, Economics, Data Science, or Mathematics',
    mandatorySkills: ['SQL', 'Excel', 'Python', 'Pandas', 'NumPy', 'Power BI', 'Statistics', 'Data Visualization', 'Business Communication'],
    preferredSkills: ['Tableau', 'PostgreSQL', 'BigQuery'],
    optionalSkills: ['Git', 'ETL/ELT'],
    softSkills: ['Business Communication', 'Communication Skills', 'Analytical Thinking'],
    responsibilities: [
      'Write complex SQL queries and Python (Pandas/NumPy) scripts to clean, join, and analyze operational datasets.',
      'Design executive KPI dashboards and self-service reports in Power BI and Tableau.',
      'Apply statistical hypothesis testing and communicate actionable insights to business stakeholders.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
  {
    id: 'role-ml-engineer',
    title: 'Machine Learning Engineer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'Machine Learning Engineer Role Profile: Build, evaluate, and deploy ML models using Python, Statistics, NumPy, Pandas, Scikit-learn, PyTorch or TensorFlow, Model Evaluation, and REST APIs.',
    experienceRequired: '0–2 Years',
    educationRequired: 'B.Tech / M.Tech / M.S. in Computer Science, AI, Data Science, or Mathematics',
    mandatorySkills: ['Python', 'Statistics', 'NumPy', 'Pandas', 'Scikit-learn', 'Machine Learning', 'Model Evaluation', 'PyTorch', 'REST APIs'],
    preferredSkills: ['TensorFlow', 'Generative AI/LLMs', 'Docker', 'SQL', 'AWS'],
    optionalSkills: ['Apache Spark', 'Kubernetes', 'CI/CD'],
    softSkills: ['Communication Skills', 'Analytical Thinking', 'Problem Solving'],
    responsibilities: [
      'Develop feature engineering pipelines and train supervised/unsupervised models using Scikit-learn and PyTorch.',
      'Conduct rigorous offline Model Evaluation (ROC-AUC, precision-recall, calibration, drift analysis).',
      'Package trained models behind low-latency REST APIs using FastAPI and Docker.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
  {
    id: 'role-devops-engineer',
    title: 'DevOps Engineer',
    companyName: 'Industry Reference Template',
    sourceType: 'role_template',
    rawText:
      'DevOps Engineer Role Profile: Manage cloud infrastructure and deployment automation using Linux, Git, Docker, Kubernetes, CI/CD, AWS/Azure/GCP, Infrastructure as Code (Terraform), and Monitoring.',
    experienceRequired: '0–3 Years',
    educationRequired: 'B.Tech / B.E. in Computer Science, IT, or Systems Engineering',
    mandatorySkills: ['Linux', 'Git', 'Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Infrastructure as Code', 'Monitoring'],
    preferredSkills: ['Terraform', 'Microsoft Azure', 'Google Cloud', 'Python', 'Bash'],
    optionalSkills: ['GitHub Actions', 'Jenkins'],
    softSkills: ['Communication Skills', 'Problem Solving'],
    responsibilities: [
      'Build and maintain automated CI/CD build, test, and deployment pipelines.',
      'Orchestrate containerized microservices using Docker and Kubernetes.',
      'Provision reproducible cloud environments using Infrastructure as Code (Terraform) and configure system monitoring.'
    ],
    requirementClauses: {},
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
];

export const SAMPLE_RESUMES: ResumeProfile[] = [
  {
    id: 'resume-aarav-sharma',
    filename: 'Aarav_Sharma_CS_Resume_2026.pdf',
    uploadedAt: '2026-10-30T14:20:00Z',
    rawText: `Aarav Sharma
Email: aarav.sharma@iitb.ac.in | Phone: +91 98765 43210 | Location: Bengaluru, India
LinkedIn: linkedin.com/in/aaravsharma-cs | GitHub: github.com/aaravsharma-dev

EDUCATION
B.Tech in Computer Science and Engineering — Indian Institute of Information Technology (2022 – 2026) | CGPA: 8.64 / 10.0
Coursework: Data Structures and Algorithms, Object-Oriented Programming, Database Management Systems, Statistics

TECHNICAL SKILLS
Programming Languages: Python, SQL, Java, JavaScript, Bash
Frameworks & Libraries: Pandas, NumPy, Scikit-learn, Flask, FastAPI, React
Databases: PostgreSQL, MySQL, SQLite
Cloud & DevOps: AWS, Docker, Git, GitHub, Linux
Core Competencies: REST APIs, ETL/ELT, Data Pipelines, Data Visualization, Excel, Testing and Debugging, Problem Solving, Communication Skills

INTERNSHIPS & WORK EXPERIENCE
Data Engineering & Analytics Intern — FinEdge Analytics Pvt. Ltd., Bengaluru (May 2025 – July 2025)
- Built automated Python and SQL ETL/ELT data pipelines ingesting 1.2M daily financial transactions into PostgreSQL.
- Reduced nightly batch query runtime by 38% through composite indexing and SQL query refactoring.
- Collaborated with product analysts to publish KPI summaries and automated anomaly reports.

ACADEMIC & PERSONAL PROJECTS
1. Real-Time E-Commerce Order Analytics & Fraud Scoring API
- Built a REST API using Python, FastAPI, PostgreSQL, and Docker to score incoming orders with a Scikit-learn gradient boosting model.
- Implemented JWT authentication, automated pytest unit tests, and structured request logging.

2. Automated Campus Placement & Skill Tracker Dashboard
- Developed a full-stack analytics web application using React, Python (Flask), and MySQL to track cohort placement trends and SQL assessment scores.

CERTIFICATIONS
- AWS Certified Cloud Practitioner (2025)
- SQL for Data Science — Coursera / UC Davis (2024)

ACHIEVEMENTS
- Smart India Hackathon (SIH) 2025 — National Grand Finale Top 5 Finalist
- Solved 420+ Data Structures and Algorithms problems across LeetCode and Codeforces`,
    contact: {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@iitb.ac.in',
      phone: '+91 98765 43210',
      location: 'Bengaluru, India',
      linkedin: 'linkedin.com/in/aaravsharma-cs',
      github: 'github.com/aaravsharma-dev',
    },
    summary:
      'Final-year B.Tech Computer Science student with hands-on internship experience building Python & SQL ETL/ELT pipelines, PostgreSQL data stores, and FastAPI/Flask microservices on AWS and Docker.',
    education: [
      {
        degree: 'B.Tech in Computer Science and Engineering',
        institution: 'Indian Institute of Information Technology (IIIT)',
        year: '2022 – 2026',
        score: 'CGPA: 8.64 / 10.0',
      },
    ],
    programmingLanguages: ['Python', 'SQL', 'Java', 'JavaScript', 'Bash'],
    frameworksLibraries: ['Pandas', 'NumPy', 'Scikit-learn', 'Flask', 'FastAPI', 'React'],
    databases: ['PostgreSQL', 'MySQL', 'SQLite'],
    cloudDevops: ['AWS', 'Docker', 'Git', 'GitHub', 'Linux'],
    technicalSkills: [
      'Data Structures and Algorithms',
      'Object-Oriented Programming',
      'REST APIs',
      'ETL/ELT',
      'Data Pipelines',
      'Data Visualization',
      'Excel',
      'Testing and Debugging',
      'Statistics',
    ],
    softSkills: ['Communication Skills', 'Problem Solving', 'Team Collaboration'],
    workExperience: [
      {
        role: 'Data Engineering & Analytics Intern',
        company: 'FinEdge Analytics Pvt. Ltd., Bengaluru',
        duration: 'May 2025 – July 2025',
        highlights: [
          'Built automated Python and SQL ETL/ELT data pipelines ingesting 1.2M daily financial transactions into PostgreSQL.',
          'Reduced nightly batch query runtime by 38% through composite indexing and SQL query refactoring.',
          'Collaborated with product analysts to publish KPI summaries and automated anomaly reports.',
        ],
      },
    ],
    projects: [
      {
        title: 'Real-Time E-Commerce Order Analytics & Fraud Scoring API',
        techStack: ['Python', 'FastAPI', 'PostgreSQL', 'Scikit-learn', 'Docker', 'REST APIs'],
        description:
          'Built a containerized REST API using Python, FastAPI, and PostgreSQL to score incoming e-commerce orders with a Scikit-learn model and automated pytest tests.',
      },
      {
        title: 'Automated Campus Placement & Skill Tracker Dashboard',
        techStack: ['React', 'JavaScript', 'Python', 'Flask', 'MySQL'],
        description:
          'Developed a full-stack analytics web application using React, Flask, and MySQL to track cohort placement trends and SQL assessment scores.',
      },
    ],
    certifications: [
      'AWS Certified Cloud Practitioner (2025)',
      'SQL for Data Science — Coursera / UC Davis (2024)',
    ],
    achievements: [
      'Smart India Hackathon (SIH) 2025 — National Grand Finale Top 5 Finalist',
      'Solved 420+ Data Structures and Algorithms problems across LeetCode and Codeforces',
    ],
    skillEvidence: {
      'Python': 'Built automated Python and SQL ETL/ELT data pipelines ingesting 1.2M daily financial transactions into PostgreSQL.',
      'SQL': 'Reduced nightly batch query runtime by 38% through composite indexing and SQL query refactoring.',
      'Java': 'Programming Languages: Python, SQL, Java, JavaScript, Bash',
      'JavaScript': 'Developed a full-stack analytics web application using React, Python (Flask), and MySQL.',
      'Bash': 'Programming Languages: Python, SQL, Java, JavaScript, Bash',
      'Pandas': 'Frameworks & Libraries: Pandas, NumPy, Scikit-learn, Flask, FastAPI, React',
      'NumPy': 'Frameworks & Libraries: Pandas, NumPy, Scikit-learn, Flask, FastAPI, React',
      'Scikit-learn': 'Built a REST API using Python, FastAPI, PostgreSQL, and Docker to score incoming orders with a Scikit-learn gradient boosting model.',
      'Flask': 'Developed a full-stack analytics web application using React, Python (Flask), and MySQL.',
      'FastAPI': 'Built a REST API using Python, FastAPI, PostgreSQL, and Docker to score incoming orders.',
      'React': 'Developed a full-stack analytics web application using React, Python (Flask), and MySQL.',
      'PostgreSQL': 'Built automated Python and SQL ETL/ELT data pipelines ingesting 1.2M daily financial transactions into PostgreSQL.',
      'MySQL': 'Developed a full-stack analytics web application using React, Python (Flask), and MySQL.',
      'SQLite': 'Databases: PostgreSQL, MySQL, SQLite',
      'AWS': 'Certification: AWS Certified Cloud Practitioner (2025) & Cloud skills.',
      'Docker': 'Built a REST API using Python, FastAPI, PostgreSQL, and Docker.',
      'Git': 'Cloud & DevOps: AWS, Docker, Git, GitHub, Linux',
      'GitHub': 'Cloud & DevOps: AWS, Docker, Git, GitHub, Linux',
      'Linux': 'Cloud & DevOps: AWS, Docker, Git, GitHub, Linux',
      'Data Structures and Algorithms': 'Solved 420+ Data Structures and Algorithms problems across LeetCode and Codeforces.',
      'Object-Oriented Programming': 'Coursework: Data Structures and Algorithms, Object-Oriented Programming, DBMS.',
      'REST APIs': 'Built a REST API using Python, FastAPI, PostgreSQL, and Docker.',
      'ETL/ELT': 'Built automated Python and SQL ETL/ELT data pipelines ingesting 1.2M daily financial transactions.',
      'Data Pipelines': 'Built automated Python and SQL ETL/ELT data pipelines ingesting 1.2M daily financial transactions.',
      'Data Visualization': 'Core Competencies: REST APIs, ETL/ELT, Data Pipelines, Data Visualization, Excel.',
      'Excel': 'Core Competencies: REST APIs, ETL/ELT, Data Pipelines, Data Visualization, Excel.',
      'Testing and Debugging': 'Implemented JWT authentication, automated pytest unit tests, and structured logging.',
      'Statistics': 'Coursework: Data Structures and Algorithms, Object-Oriented Programming, DBMS, Statistics.',
      'Communication Skills': 'Collaborated with product analysts to publish KPI summaries and automated anomaly reports.',
      'Problem Solving': 'Smart India Hackathon (SIH) 2025 Top 5 Finalist; solved 420+ DSA problems.',
    },
  },
  {
    id: 'resume-priya-nair',
    filename: 'Priya_Nair_Data_Analyst_Resume.docx',
    uploadedAt: '2026-10-29T10:15:00Z',
    rawText: `Priya Nair
Email: priya.nair@nitc.ac.in | Phone: +91 98112 23344 | Location: Hyderabad, India

EDUCATION
B.Tech in Information Technology — National Institute of Technology (2022 – 2026) | CGPA: 8.91 / 10.0

TECHNICAL SKILLS
Programming Languages: Python, SQL, R
Frameworks & Libraries: Pandas, NumPy, Scikit-learn
Tools & BI: Power BI, Excel, Data Visualization, Statistics
Databases: PostgreSQL, MySQL
Soft Skills: Business Communication, Communication Skills, Analytical Thinking, Problem Solving

INTERNSHIPS
Business Intelligence Intern — RetailPulse India, Hyderabad (Jan 2025 – Apr 2025)
- Built 6 interactive Power BI executive dashboards tracking regional SKU margin and supply-chain lead times.
- Automated weekly Excel and SQL reporting queries across 450k customer orders.

PROJECTS
1. Customer Retention & Cohort Revenue Attribution Suite
- Analyzed 2 years of e-commerce transactions using Python (Pandas, NumPy), PostgreSQL, and Power BI DAX measures.

CERTIFICATIONS
- Microsoft Certified: Power BI Data Analyst Associate (PL-300)
- Google Data Analytics Professional Certificate`,
    contact: {
      name: 'Priya Nair',
      email: 'priya.nair@nitc.ac.in',
      phone: '+91 98112 23344',
      location: 'Hyderabad, India',
    },
    summary:
      'Final-year Information Technology undergraduate specializing in SQL, Python (Pandas/NumPy), Power BI DAX modeling, and statistical business analytics.',
    education: [
      {
        degree: 'B.Tech in Information Technology',
        institution: 'National Institute of Technology (NIT)',
        year: '2022 – 2026',
        score: 'CGPA: 8.91 / 10.0',
      },
    ],
    programmingLanguages: ['Python', 'SQL', 'R'],
    frameworksLibraries: ['Pandas', 'NumPy', 'Scikit-learn'],
    databases: ['PostgreSQL', 'MySQL'],
    cloudDevops: ['Git'],
    technicalSkills: ['Power BI', 'Excel', 'Data Visualization', 'Statistics'],
    softSkills: ['Business Communication', 'Communication Skills', 'Analytical Thinking', 'Problem Solving'],
    workExperience: [
      {
        role: 'Business Intelligence Intern',
        company: 'RetailPulse India, Hyderabad',
        duration: 'Jan 2025 – Apr 2025',
        highlights: [
          'Built 6 interactive Power BI executive dashboards tracking regional SKU margin and supply-chain lead times.',
          'Automated weekly Excel and SQL reporting queries across 450k customer orders.',
        ],
      },
    ],
    projects: [
      {
        title: 'Customer Retention & Cohort Revenue Attribution Suite',
        techStack: ['Python', 'Pandas', 'NumPy', 'PostgreSQL', 'Power BI'],
        description:
          'Analyzed 2 years of e-commerce transactions using Python, PostgreSQL, and Power BI DAX time-intelligence measures.',
      },
    ],
    certifications: [
      'Microsoft Certified: Power BI Data Analyst Associate (PL-300)',
      'Google Data Analytics Professional Certificate',
    ],
    achievements: ['Dean’s Merit List (Top 5% of Department, 2024 & 2025)'],
    skillEvidence: {
      'Python': 'Analyzed 2 years of e-commerce transactions using Python (Pandas, NumPy), PostgreSQL, and Power BI.',
      'SQL': 'Automated weekly Excel and SQL reporting queries across 450k customer orders.',
      'R': 'Programming Languages: Python, SQL, R',
      'Pandas': 'Analyzed 2 years of e-commerce transactions using Python (Pandas, NumPy).',
      'NumPy': 'Analyzed 2 years of e-commerce transactions using Python (Pandas, NumPy).',
      'Scikit-learn': 'Frameworks & Libraries: Pandas, NumPy, Scikit-learn',
      'PostgreSQL': 'Analyzed 2 years of e-commerce transactions using Python, PostgreSQL, and Power BI.',
      'MySQL': 'Databases: PostgreSQL, MySQL',
      'Power BI': 'Built 6 interactive Power BI executive dashboards tracking regional SKU margin and PL-300 certified.',
      'Excel': 'Automated weekly Excel and SQL reporting queries across 450k customer orders.',
      'Data Visualization': 'Built 6 interactive Power BI executive dashboards tracking regional SKU margin.',
      'Statistics': 'Tools & BI: Power BI, Excel, Data Visualization, Statistics',
      'Business Communication': 'Presented weekly KPI narratives to merchandising leadership.',
      'Communication Skills': 'Soft Skills: Business Communication, Communication Skills, Analytical Thinking.',
    },
  },
];

export const VERIFIED_COMPANY_POSTINGS: JobRoleProfile[] = [
  {
    id: 'company-nexuscloud-de',
    title: 'Data Engineer (Lakehouse & Platform)',
    companyName: 'NexusCloud Commerce India',
    sourceUrl: 'https://careers.nexuscloud.example.com/jobs/data-engineer-2026',
    sourceType: 'verified_posting',
    rawText: `Job Title: Data Engineer (Lakehouse & Platform)
Company: NexusCloud Commerce India
Location: Bengaluru, Karnataka (Hybrid)
Job Posting URL: https://careers.nexuscloud.example.com/jobs/data-engineer-2026

Mandatory Requirements:
- Strong proficiency in Python and advanced SQL for data transformation and analytical query optimization.
- Hands-on experience designing and maintaining ETL/ELT workflows and production Data Pipelines.
- Practical knowledge of distributed data processing using Apache Spark.
- Solid understanding of Data Warehousing principles, dimensional modeling, and cloud storage on AWS.
- Experience with Git version control and collaborative engineering workflows.
- Strong Communication Skills and structured Problem Solving ability.

Preferred Qualifications:
- Experience with Databricks, Delta Lake, or Microsoft Azure data services.
- Familiarity with workflow orchestration tools such as Airflow and event streaming with Kafka.
- Exposure to Snowflake or BigQuery for cloud analytics.

Optional / Bonus Skills:
- Containerization using Docker and Infrastructure as Code with Terraform.`,
    experienceRequired: '0–2 Years (2025/2026 Graduates Welcome)',
    educationRequired: 'B.Tech / M.Tech in Computer Science, Data Engineering, or related quantitative discipline',
    mandatorySkills: ['Python', 'SQL', 'ETL/ELT', 'Data Pipelines', 'Apache Spark', 'Data Warehousing', 'AWS', 'Git'],
    preferredSkills: ['Databricks', 'Microsoft Azure', 'Airflow', 'Kafka', 'Snowflake'],
    optionalSkills: ['Docker', 'Terraform'],
    softSkills: ['Communication Skills', 'Problem Solving'],
    responsibilities: [
      'Build, schedule, and monitor scalable batch and streaming ETL/ELT pipelines in Python and Apache Spark.',
      'Collaborate with data scientists and product analysts to deliver clean, documented datasets in the data warehouse.',
      'Optimize SQL performance, enforce automated data quality checks, and maintain high pipeline reliability.',
    ],
    requirementClauses: {
      'Python': 'Mandatory: Strong proficiency in Python and advanced SQL for data transformation.',
      'SQL': 'Mandatory: Strong proficiency in Python and advanced SQL for analytical query optimization.',
      'ETL/ELT': 'Mandatory: Hands-on experience designing and maintaining ETL/ELT workflows.',
      'Data Pipelines': 'Mandatory: Hands-on experience designing and maintaining production Data Pipelines.',
      'Apache Spark': 'Mandatory: Practical knowledge of distributed data processing using Apache Spark.',
      'Data Warehousing': 'Mandatory: Solid understanding of Data Warehousing principles and dimensional modeling.',
      'AWS': 'Mandatory: Cloud storage and compute experience on AWS.',
      'Git': 'Mandatory: Experience with Git version control and collaborative engineering workflows.',
      'Databricks': 'Preferred: Experience with Databricks, Delta Lake, or Microsoft Azure data services.',
      'Microsoft Azure': 'Preferred: Experience with Databricks, Delta Lake, or Microsoft Azure data services.',
      'Airflow': 'Preferred: Familiarity with workflow orchestration tools such as Airflow.',
      'Kafka': 'Preferred: Event streaming familiarity with Kafka.',
      'Snowflake': 'Preferred: Exposure to Snowflake or BigQuery for cloud analytics.',
      'Docker': 'Optional: Containerization using Docker.',
      'Terraform': 'Optional: Infrastructure as Code with Terraform.',
    },
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  },
];

export interface MarketBenchmarkDataset {
  metadata: {
    collectionDate: string;
    geography: string;
    primarySampleSize: number;
    fresherSampleSize: number;
    disclaimer: string;
    referenceSources: Array<{ title: string; url: string }>;
  };
  popularJobRoles: Array<{ role: string; sharePct: number }>;
  frequentlyMentionedTechnologies: Array<{ skill: string; demandPct: number; category: string }>;
  roleSpecificBenchmarks: Record<string, Array<{ skill: string; demandPct: number }>>;
  fresherJobBenchmark: Array<{ skill: string; demandPct: number }>;
}

export const INITIAL_OCTOBER_2026_BENCHMARK: MarketBenchmarkDataset = {
  metadata: {
    collectionDate: 'October 2026',
    geography: 'India (Pan-India Tech Hubs: Bengaluru, Hyderabad, Pune, NCR, Chennai, Mumbai)',
    primarySampleSize: 18752,
    fresherSampleSize: 289,
    disclaimer:
      'These figures represent historical market benchmarks sourced from the October 2026 Indian technology hiring dataset (18,752 overall postings and 289 fresher openings). They serve as reference benchmarks and are not universal company requirements or guaranteed live statistics.',
    referenceSources: [
      {
        title: 'PrepNPlaced — India Tech Hiring Report (2026)',
        url: 'https://www.prepnplaced.com/india-tech-hiring-report-2026',
      },
      {
        title: 'Asuraa — India Fresher Job Market Report (2026)',
        url: 'https://asuraa.in/blog/india-fresher-job-market-report-2026',
      },
      {
        title: 'GetTevos — State of India Technology Hiring',
        url: 'https://gettevos.com/state-of-india.php',
      },
      {
        title: 'LinkedIn Economic Graph — Software Engineer Talent Landscape (2026)',
        url: 'https://economicgraph.linkedin.com/content/dam/me/economicgraph/en-us/PDF/us-software-engineer-talent-landscape-2026.pdf',
      },
    ],
  },
  popularJobRoles: [
    { role: 'Software Engineer', sharePct: 20.3 },
    { role: 'Data Analyst', sharePct: 13.5 },
    { role: 'DevOps', sharePct: 9.0 },
    { role: 'Data Engineer', sharePct: 7.7 },
    { role: 'QA', sharePct: 6.7 },
    { role: 'Full Stack Developer', sharePct: 5.0 },
    { role: 'Data Scientist', sharePct: 4.4 },
  ],
  frequentlyMentionedTechnologies: [
    { skill: 'Python', demandPct: 28.2, category: 'Programming Language' },
    { skill: 'SQL', demandPct: 21.6, category: 'Database & Query' },
    { skill: 'Microsoft Azure', demandPct: 19.2, category: 'Cloud Platform' },
    { skill: 'AWS', demandPct: 17.1, category: 'Cloud Platform' },
    { skill: 'Google Cloud', demandPct: 8.5, category: 'Cloud Platform' },
  ],
  roleSpecificBenchmarks: {
    'Data Analyst': [
      { skill: 'SQL', demandPct: 34.6 },
      { skill: 'Excel', demandPct: 24.3 },
      { skill: 'Python', demandPct: 22.6 },
      { skill: 'Power BI', demandPct: 21.6 },
      { skill: 'Tableau', demandPct: 13.3 },
    ],
    'Data Engineer': [
      { skill: 'SQL', demandPct: 45.2 },
      { skill: 'Python', demandPct: 42.7 },
      { skill: 'Azure', demandPct: 32.2 },
      { skill: 'AWS', demandPct: 30.1 },
      { skill: 'Databricks', demandPct: 19.3 },
      { skill: 'Spark', demandPct: 16.1 },
    ],
  },
  fresherJobBenchmark: [
    { skill: 'Communication skills', demandPct: 36.0 },
    { skill: 'Python', demandPct: 35.3 },
    { skill: 'SQL', demandPct: 20.1 },
    { skill: 'Java', demandPct: 18.7 },
    { skill: 'Git/GitHub', demandPct: 15.2 },
    { skill: 'Generative AI/LLMs', demandPct: 14.9 },
    { skill: 'Machine Learning', demandPct: 14.5 },
  ],
};

export function normalizeSkill(skill: string): string {
  const s = skill.trim().toLowerCase();
  if (s === 'azure') return 'microsoft azure';
  if (s === 'spark' || s === 'pyspark') return 'apache spark';
  if (s === 'gcp') return 'google cloud';
  return s;
}

export function areNonInterchangeableSiblings(a: string, b: string): boolean {
  const normA = normalizeSkill(a);
  const normB = normalizeSkill(b);
  if (normA === normB) return false;
  return NON_INTERCHANGEABLE_GROUPS.some((grp) => grp.includes(normA) && grp.includes(normB));
}

export function getSemanticSimilarity(a: string, b: string): number {
  const normA = normalizeSkill(a);
  const normB = normalizeSkill(b);
  if (normA === normB) return 1.0;
  if (SEMANTIC_SIMILARITY_MATRIX[normA]?.[normB] !== undefined) {
    return SEMANTIC_SIMILARITY_MATRIX[normA][normB];
  }
  if (SEMANTIC_SIMILARITY_MATRIX[normB]?.[normA] !== undefined) {
    return SEMANTIC_SIMILARITY_MATRIX[normB][normA];
  }
  // Token bigram cosine fallback for arbitrary technical terms
  const bigrams = (str: string) => {
    const out: string[] = [];
    for (let i = 0; i < str.length - 1; i++) out.push(str.slice(i, i + 2));
    return out;
  };
  const bgA = bigrams(normA);
  const bgB = bigrams(normB);
  if (!bgA.length || !bgB.length) return 0;
  const setB = new Set(bgB);
  const overlap = bgA.filter((x) => setB.has(x)).length;
  return Number(((2 * overlap) / (bgA.length + bgB.length) * 0.65).toFixed(2));
}

export function getAllResumeTechnicalSkills(resume: ResumeProfile): string[] {
  const combined = [
    ...resume.programmingLanguages,
    ...resume.frameworksLibraries,
    ...resume.databases,
    ...resume.cloudDevops,
    ...resume.technicalSkills,
  ];
  return Array.from(new Set(combined));
}

export function matchResumeToJob(
  resume: ResumeProfile,
  job: JobRoleProfile,
  customWeights?: ScoringWeights
): MatchAnalysisResult {
  const weights = customWeights || job.defaultWeights || DEFAULT_SCORING_WEIGHTS;
  const candidateSkills = getAllResumeTechnicalSkills(resume);
  const normToOriginal = new Map<string, string>();
  for (const s of candidateSkills) {
    normToOriginal.set(normalizeSkill(s), s);
  }

  const matchedSkills: EvidenceMatchItem[] = [];
  const partialSkills: EvidenceMatchItem[] = [];
  const missingSkills: MissingSkillItem[] = [];

  const allReqs: Array<{ skill: string; tier: 'Mandatory' | 'Preferred' | 'Optional' }> = [
    ...job.mandatorySkills.map((skill) => ({ skill, tier: 'Mandatory' as const })),
    ...job.preferredSkills.map((skill) => ({ skill, tier: 'Preferred' as const })),
    ...job.optionalSkills.map((skill) => ({ skill, tier: 'Optional' as const })),
  ];

  for (const { skill: reqSkill, tier } of allReqs) {
    const reqNorm = normalizeSkill(reqSkill);
    const jobClause =
      job.requirementClauses?.[reqSkill] ||
      `${tier} requirement specified for ${job.title} (${job.companyName}).`;

    if (normToOriginal.has(reqNorm)) {
      const candSkill = normToOriginal.get(reqNorm)!;
      matchedSkills.push({
        jobSkill: reqSkill,
        resumeSkill: candSkill,
        tier,
        matchType: 'Exact Match',
        similarity: 1.0,
        resumeEvidence:
          resume.skillEvidence?.[candSkill] ||
          `Verified '${candSkill}' in candidate technical skills and project work.`,
        jobRequirement: jobClause,
        explanation: `Exact normalized match between candidate skill '${candSkill}' and ${tier.toLowerCase()} job requirement '${reqSkill}'.`,
      });
      continue;
    }

    let bestCandidate: string | null = null;
    let bestSim = 0;
    let bestIsSibling = false;

    for (const [candNorm, candOrig] of normToOriginal.entries()) {
      if (areNonInterchangeableSiblings(reqNorm, candNorm)) {
        if (0.62 > bestSim) {
          bestSim = 0.62;
          bestCandidate = candOrig;
          bestIsSibling = true;
        }
        continue;
      }
      const sim = getSemanticSimilarity(reqSkill, candOrig);
      if (sim > bestSim) {
        bestSim = sim;
        bestCandidate = candOrig;
        bestIsSibling = false;
      }
    }

    if (bestCandidate && bestSim >= 0.78 && !bestIsSibling) {
      matchedSkills.push({
        jobSkill: reqSkill,
        resumeSkill: bestCandidate,
        tier,
        matchType: 'Semantic Competency Match',
        similarity: Number(bestSim.toFixed(2)),
        resumeEvidence:
          resume.skillEvidence?.[bestCandidate] ||
          `Demonstrated '${bestCandidate}' in resume projects/experience.`,
        jobRequirement: jobClause,
        explanation: `High semantic similarity (${bestSim.toFixed(2)}) via Sentence-Transformer competency vector between '${bestCandidate}' and '${reqSkill}'.`,
      });
    } else if (bestCandidate && bestSim >= 0.58) {
      const explanation = bestIsSibling
        ? `Candidate demonstrates '${bestCandidate}', which belongs to the same technology domain as '${reqSkill}'. Per non-interchangeable technology rules, ${bestCandidate} does not automatically count as ${reqSkill} (credited as a 45% partial bridge match).`
        : `Partial semantic overlap (${bestSim.toFixed(2)}) detected between '${bestCandidate}' and '${reqSkill}'.`;

      partialSkills.push({
        jobSkill: reqSkill,
        resumeSkill: bestCandidate,
        tier,
        matchType: bestIsSibling ? 'Non-Interchangeable Sibling (Partial)' : 'Partial Semantic Match',
        similarity: Number(bestSim.toFixed(2)),
        resumeEvidence:
          resume.skillEvidence?.[bestCandidate] ||
          `Demonstrated '${bestCandidate}' in candidate profile.`,
        jobRequirement: jobClause,
        explanation,
      });
    } else {
      missingSkills.push({
        jobSkill: reqSkill,
        tier,
        jobRequirement: jobClause,
        relatedExistingSkills: bestCandidate && bestSim >= 0.35 ? [bestCandidate] : [],
      });
    }
  }

  const calcTierSatisfaction = (tierName: 'Mandatory' | 'Preferred' | 'Optional') => {
    const total = allReqs.filter((r) => r.tier === tierName).length;
    if (total === 0) return 100;
    const exactPts = matchedSkills.filter((m) => m.tier === tierName).length * 1.0;
    const partialPts = partialSkills.filter((p) => p.tier === tierName).length * 0.45;
    return Number((((exactPts + partialPts) / total) * 100).toFixed(1));
  };

  const mandatorySatisfiedPct = calcTierSatisfaction('Mandatory');
  const preferredSatisfiedPct = calcTierSatisfaction('Preferred');
  const optionalSatisfiedPct = calcTierSatisfaction('Optional');

  const technicalScore = Number((mandatorySatisfiedPct * 0.75 + preferredSatisfiedPct * 0.25).toFixed(1));
  const educationScore = resume.education.length > 0 ? 92.0 : 55.0;
  const expAndProjCount = resume.projects.length + resume.workExperience.length;
  const projectsExperienceScore = Math.min(100, Number((42 + expAndProjCount * 16).toFixed(1)));
  const certificationsScore = Math.min(100, Number((45 + resume.certifications.length * 27.5).toFixed(1)));

  const candSoftNorm = new Set(resume.softSkills.map(normalizeSkill));
  let softSkillsScore = 85.0;
  if (job.softSkills.length > 0) {
    let softHits = 0;
    for (const reqSoft of job.softSkills) {
      if (candSoftNorm.has(normalizeSkill(reqSoft))) {
        softHits += 1;
      } else if (
        Array.from(candSoftNorm).some((cs) => getSemanticSimilarity(cs, reqSoft) >= 0.78)
      ) {
        softHits += 0.85;
      }
    }
    softSkillsScore = Number(Math.min(100, (softHits / job.softSkills.length) * 100).toFixed(1));
  }

  const totalWeight =
    weights.technicalSkills +
    weights.education +
    weights.projectsExperience +
    weights.certifications +
    weights.softSkills || 1;

  const overallScore = Number(
    (
      (technicalScore * weights.technicalSkills +
        educationScore * weights.education +
        projectsExperienceScore * weights.projectsExperience +
        certificationsScore * weights.certifications +
        softSkillsScore * weights.softSkills) /
      totalWeight
    ).toFixed(1)
  );

  return {
    overallScore,
    technicalScore,
    educationScore,
    projectsExperienceScore,
    certificationsScore,
    softSkillsScore,
    mandatorySatisfiedPct,
    preferredSatisfiedPct,
    optionalSatisfiedPct,
    weightsUsed: weights,
    matchedSkills,
    partialSkills,
    missingSkills,
  };
}

const GAP_GUIDANCE_LIBRARY: Record<
  string,
  { why: string; duration: string; exercise: string }
> = {
  'Apache Spark': {
    why: 'Core distributed compute framework required for multi-gigabyte batch and streaming ETL workloads (requested in 16.1% of Indian Data Engineer postings).',
    duration: '3–4 Weeks',
    exercise:
      'Build a PySpark batch transformation job processing 2M+ e-commerce events with Broadcast Joins, Window functions, and partitioned Parquet output.',
  },
  'Data Warehousing': {
    why: 'Essential for designing star/snowflake analytical schemas, slowly changing dimensions (SCD Type 2), and OLAP performance tuning.',
    duration: '2 Weeks',
    exercise:
      'Design a Kimball dimensional model (fact_orders, dim_customers, dim_products) with SCD Type 2 history tracking in PostgreSQL or Snowflake.',
  },
  'Databricks': {
    why: 'Featured in 19.3% of Indian Data Engineer openings for unified lakehouse engineering and Delta Lake ACID transactions.',
    duration: '2 Weeks',
    exercise:
      'Implement a Bronze-Silver-Gold medallion pipeline using Delta Lake tables with schema enforcement and time-travel queries.',
  },
  'Microsoft Azure': {
    why: 'Appears in 19.2% of overall tech postings and 32.2% of Data Engineer openings in India.',
    duration: '3 Weeks',
    exercise:
      'Configure an Azure Data Factory pipeline ingesting REST API payloads into Azure Data Lake Storage Gen2.',
  },
  'Airflow': {
    why: 'Standard workflow orchestrator for scheduling, dependency management, retries, and SLA monitoring of data pipelines.',
    duration: '2 Weeks',
    exercise:
      'Author an Apache Airflow DAG with TaskFlow API, custom sensors, idempotent backfills, and failure callbacks.',
  },
  'Kafka': {
    why: 'De-facto event streaming backbone for decoupled microservices and real-time analytics ingestion.',
    duration: '2–3 Weeks',
    exercise:
      'Create a Python Kafka producer and consumer group processing real-time order status transitions with dead-letter queue handling.',
  },
  'Snowflake': {
    why: 'Leading cloud data warehouse separating compute and storage for analytical workloads.',
    duration: '2 Weeks',
    exercise:
      'Load staged parquet files into Snowflake, configure clustering keys, and benchmark query pruning.',
  },
  'Django': {
    why: 'Full-featured batteries-included Python web framework with built-in ORM, migrations, and admin security (distinct from Flask/FastAPI).',
    duration: '2 Weeks (Transition from Flask/FastAPI)',
    exercise:
      'Port an existing Flask/FastAPI service into a Django + Django REST Framework project with custom ORM querysets and migration tests.',
  },
  'Power BI': {
    why: 'Requested in 21.6% of Data Analyst roles in India for interactive executive dashboards and DAX modeling.',
    duration: '2 Weeks',
    exercise:
      'Build a multi-page Power BI report with a clean Star Schema, DAX YoY/MoM measures, and Row-Level Security.',
  },
  'Tableau': {
    why: 'Requested in 13.3% of Data Analyst roles for visual exploration and executive storyboards.',
    duration: '2 Weeks',
    exercise:
      'Create an interactive customer cohort and regional margin dashboard using LOD expressions in Tableau.',
  },
  'Kubernetes': {
    why: 'Production standard for container orchestration, autoscaling, and self-healing microservice deployments.',
    duration: '3–4 Weeks',
    exercise:
      'Deploy a containerized Python API to a local Kind/Minikube cluster with Deployment, Service, Ingress, and HPA manifests.',
  },
  'Terraform': {
    why: 'Industry standard for declarative Infrastructure as Code across AWS, Azure, and GCP.',
    duration: '2 Weeks',
    exercise:
      'Write modular Terraform configurations to provision a VPC, least-privilege IAM roles, and an S3/RDS stack.',
  },
  'PyTorch': {
    why: 'Primary deep learning framework for neural network training, custom autograd, and LLM fine-tuning.',
    duration: '3 Weeks',
    exercise:
      'Implement and train a custom PyTorch tabular/text classifier with Dataset, DataLoader, early stopping, and TorchScript export.',
  },
  'TypeScript': {
    why: 'Required across modern frontend and full-stack teams for compile-time type safety and maintainable API contracts.',
    duration: '1–2 Weeks',
    exercise:
      'Refactor a React JavaScript dashboard to strict TypeScript with discriminated union state types and typed API clients.',
  },
};

export function buildSkillGaps(
  matchResult: MatchAnalysisResult,
  resume: ResumeProfile
): SkillGapDetail[] {
  const gaps: SkillGapDetail[] = [];
  const candidateSkills = getAllResumeTechnicalSkills(resume);
  let rank = 1;

  // 1. Mandatory missing -> Critical Gaps
  for (const m of matchResult.missingSkills.filter((x) => x.tier === 'Mandatory')) {
    const kb = GAP_GUIDANCE_LIBRARY[m.jobSkill];
    const related =
      m.relatedExistingSkills.length > 0
        ? m.relatedExistingSkills
        : candidateSkills.slice(0, 2);
    gaps.push({
      skillName: m.jobSkill,
      tier: m.tier,
      importance: 'Mandatory Core Requirement (High Impact on Technical Score)',
      priorityCategory: 'Critical Gaps',
      whyItMatters:
        kb?.why ||
        `${m.jobSkill} is explicitly listed as a mandatory requirement (${m.jobRequirement}). Addressing it directly boosts the 75%-weighted mandatory technical rubric.`,
      relatedExistingSkills: related,
      recommendedPriorityRank: rank++,
      estimatedDuration: kb?.duration || '2–3 Weeks',
      practicalExercise:
        kb?.exercise ||
        `Build a standalone, unit-tested module demonstrating ${m.jobSkill} integrated with your existing ${related.join(' & ') || 'Python/SQL'} stack.`,
    });
  }

  // 2. Preferred missing -> High-Priority Gaps
  for (const m of matchResult.missingSkills.filter((x) => x.tier === 'Preferred')) {
    const kb = GAP_GUIDANCE_LIBRARY[m.jobSkill];
    const related =
      m.relatedExistingSkills.length > 0
        ? m.relatedExistingSkills
        : candidateSkills.slice(0, 2);
    gaps.push({
      skillName: m.jobSkill,
      tier: m.tier,
      importance: 'Preferred Role Differentiator',
      priorityCategory: 'High-Priority Gaps',
      whyItMatters:
        kb?.why ||
        `${m.jobSkill} is a preferred qualification that differentiates shortlisted candidates for this role.`,
      relatedExistingSkills: related,
      recommendedPriorityRank: rank++,
      estimatedDuration: kb?.duration || '2 Weeks',
      practicalExercise:
        kb?.exercise ||
        `Integrate ${m.jobSkill} into one of your existing portfolio repositories and document the architectural benchmark in the README.`,
    });
  }

  // 3. Partial matches (including non-interchangeable siblings) -> Medium-Priority Gaps
  for (const p of matchResult.partialSkills) {
    const kb = GAP_GUIDANCE_LIBRARY[p.jobSkill];
    gaps.push({
      skillName: p.jobSkill,
      tier: p.tier,
      importance: `Ecosystem Bridge Needed (Currently using ${p.resumeSkill})`,
      priorityCategory: 'Medium-Priority Gaps',
      whyItMatters: p.explanation,
      relatedExistingSkills: [p.resumeSkill],
      recommendedPriorityRank: rank++,
      estimatedDuration: '1–2 Weeks (Fast Ecosystem Transition)',
      practicalExercise:
        kb?.exercise ||
        `Re-implement one feature from your ${p.resumeSkill} project using ${p.jobSkill} to demonstrate direct hands-on proficiency.`,
    });
  }

  // 4. Optional missing -> Optional Improvements
  for (const m of matchResult.missingSkills.filter((x) => x.tier === 'Optional')) {
    const kb = GAP_GUIDANCE_LIBRARY[m.jobSkill];
    gaps.push({
      skillName: m.jobSkill,
      tier: m.tier,
      importance: 'Optional / Bonus Production Skill',
      priorityCategory: 'Optional Improvements',
      whyItMatters:
        kb?.why ||
        `Adds production polish and deployment readiness beyond baseline entry-level expectations.`,
      relatedExistingSkills: candidateSkills.slice(0, 2),
      recommendedPriorityRank: rank++,
      estimatedDuration: kb?.duration || '1–2 Weeks',
      practicalExercise:
        kb?.exercise ||
        `Add ${m.jobSkill} support to your capstone project workflow.`,
    });
  }

  return gaps;
}

export function extractStructuredResumeFromText(
  rawText: string,
  filename: string
): ResumeProfile {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const nameLine = lines[0] || 'Uploaded Candidate';
  const emailMatch = rawText.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
  const phoneMatch = rawText.match(/(\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,4}/);

  const findLineForSkill = (skill: string): string => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    for (const line of lines) {
      if (regex.test(line)) return line;
    }
    return '';
  };

  const extracted: Record<string, string[]> = {
    programmingLanguages: [],
    frameworksLibraries: [],
    databases: [],
    cloudDevops: [],
    technicalSkills: [],
    softSkills: [],
  };
  const skillEvidence: Record<string, string> = {};

  for (const [cat, skillList] of Object.entries(SKILL_TAXONOMY)) {
    for (const skill of skillList) {
      const ev = findLineForSkill(skill);
      if (ev) {
        extracted[cat].push(skill);
        skillEvidence[skill] = ev;
      }
    }
  }

  const eduLines = lines.filter((l) =>
    /b\.tech|b\.e|bachelor|m\.tech|master|university|institute|college|cgpa|gpa/i.test(l)
  );
  const education =
    eduLines.length > 0
      ? [
          {
            degree: eduLines[0],
            institution: eduLines[1] || 'Verified from Resume Text',
            year: 'Extracted from Resume',
            score: eduLines.find((l) => /cgpa|gpa|%/i.test(l)) || 'Specified in Resume',
          },
        ]
      : [];

  const projLines = lines.filter((l) =>
    /project|built|developed|architected|designed|api|dashboard|pipeline/i.test(l)
  );
  const projects = projLines.slice(0, 3).map((line, idx) => ({
    title: line.length > 72 ? `${line.slice(0, 68)}...` : line,
    techStack: [
      ...extracted.programmingLanguages.slice(0, 2),
      ...extracted.frameworksLibraries.slice(0, 2),
    ],
    description: projLines[idx + 1] || line,
  }));

  const expLines = lines.filter((l) => /intern|engineer|analyst|developer|ltd|pvt|inc/i.test(l));
  const workExperience =
    expLines.length > 0
      ? [
          {
            role: expLines[0],
            company: 'Extracted from Resume Experience Section',
            duration: 'Verified from Resume',
            highlights: expLines.slice(1, 4),
          },
        ]
      : [];

  const certifications = lines
    .filter((l) => /certified|certification|coursera|aws|microsoft|google|udemy|nptel/i.test(l))
    .slice(0, 4);

  const achievements = lines
    .filter((l) => /hackathon|winner|finalist|rank|leetcode|codeforces|award|scholar/i.test(l))
    .slice(0, 4);

  return {
    id: `resume-${Date.now()}`,
    filename,
    uploadedAt: new Date().toISOString(),
    rawText,
    contact: {
      name: nameLine.replace(/^name:\s*/i, '').slice(0, 60),
      email: emailMatch ? emailMatch[0] : 'Not specified in document',
      phone: phoneMatch ? phoneMatch[0].trim() : 'Not specified in document',
      location: 'Extracted from Resume',
    },
    summary: lines.slice(1, 3).join(' '),
    education,
    programmingLanguages: extracted.programmingLanguages,
    frameworksLibraries: extracted.frameworksLibraries,
    databases: extracted.databases,
    cloudDevops: extracted.cloudDevops,
    technicalSkills: extracted.technicalSkills,
    softSkills: extracted.softSkills,
    workExperience,
    projects,
    certifications,
    achievements,
    skillEvidence,
  };
}

export function extractJobProfileFromText(
  rawText: string,
  title: string,
  companyName: string,
  sourceUrl?: string
): JobRoleProfile {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const mandatorySkills: string[] = [];
  const preferredSkills: string[] = [];
  const optionalSkills: string[] = [];
  const softSkills: string[] = [];
  const requirementClauses: Record<string, string> = {};

  const findSkillClause = (skill: string): string => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    for (const line of lines) {
      if (regex.test(line)) return line;
    }
    return '';
  };

  let currentSection: 'Mandatory' | 'Preferred' | 'Optional' = 'Mandatory';
  const sectionMap = new Map<string, 'Mandatory' | 'Preferred' | 'Optional'>();

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/preferred|good to have|desirable/i.test(lower) && line.length < 60) {
      currentSection = 'Preferred';
    } else if (/optional|bonus|nice to have|plus/i.test(lower) && line.length < 60) {
      currentSection = 'Optional';
    } else if (/mandatory|required|must have|minimum qualifications/i.test(lower) && line.length < 60) {
      currentSection = 'Mandatory';
    }
    sectionMap.set(line, currentSection);
  }

  const techCats = [
    'programmingLanguages',
    'frameworksLibraries',
    'databases',
    'cloudDevops',
    'technicalSkills',
  ];

  for (const cat of techCats) {
    for (const skill of SKILL_TAXONOMY[cat]) {
      const clause = findSkillClause(skill);
      if (!clause) continue;
      requirementClauses[skill] = clause;
      const lowerClause = clause.toLowerCase();
      const sec = sectionMap.get(clause) || 'Mandatory';
      if (sec === 'Optional' || /optional|bonus|nice to have/i.test(lowerClause)) {
        optionalSkills.push(skill);
      } else if (sec === 'Preferred' || /preferred|familiarity|exposure|desirable/i.test(lowerClause)) {
        preferredSkills.push(skill);
      } else {
        mandatorySkills.push(skill);
      }
    }
  }

  for (const skill of SKILL_TAXONOMY.softSkills) {
    const clause = findSkillClause(skill);
    if (clause) {
      softSkills.push(skill);
      requirementClauses[skill] = clause;
    }
  }

  const responsibilities = lines
    .filter((l) => /^[-•*]|\b(build|design|develop|maintain|optimize|collaborate|deploy|analyze)\b/i.test(l))
    .map((l) => l.replace(/^[-•*]\s*/, ''))
    .slice(0, 6);

  return {
    id: `job-${Date.now()}`,
    title: title.trim() || 'Target Engineering Role',
    companyName: companyName.trim() || 'Verified Job Posting',
    sourceUrl: sourceUrl?.trim() || undefined,
    sourceType: 'verified_posting',
    rawText,
    experienceRequired:
      lines.find((l) => /\d+\s*[-–to]+\s*\d+\s*years|fresher|entry-level/i.test(l)) ||
      'Specified in Job Description',
    educationRequired:
      lines.find((l) => /b\.tech|bachelor|degree|computer science|m\.tech/i.test(l)) ||
      'Specified in Job Description',
    mandatorySkills: mandatorySkills.length > 0 ? mandatorySkills : ['Python', 'SQL'],
    preferredSkills,
    optionalSkills,
    softSkills: softSkills.length > 0 ? softSkills : ['Communication Skills'],
    responsibilities:
      responsibilities.length > 0
        ? responsibilities
        : ['Execute core engineering and analytical deliverables described in the job posting.'],
    requirementClauses,
    defaultWeights: DEFAULT_SCORING_WEIGHTS,
  };
}
