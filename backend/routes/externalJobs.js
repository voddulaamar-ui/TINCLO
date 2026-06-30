import express from 'express';
import fetch from 'node-fetch';
import Job from '../models/Job.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { query = 'software developer', location = 'India', page = 1, num_pages = 1 } = req.query;
  const apiKey = process.env.JSEARCH_API_KEY;

  if (!apiKey) return res.json(await persistJobs(getMockJobs()));

  try {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query + ' in ' + location)}&page=${page}&num_pages=${num_pages}&date_posted=all`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'x-rapidapi-host': 'jsearch.p.rapidapi.com', 'x-rapidapi-key': apiKey },
    });
    if (!response.ok) throw new Error(`JSearch API error: ${response.status}`);
    const data = await response.json();
    const jobs = (data.data || []).map((job) => ({
      _id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location: job.job_city ? `${job.job_city}, ${job.job_country}` : job.job_country || 'Remote',
      description: job.job_description ? job.job_description.slice(0, 600) + '...' : 'No description available.',
      experience: job.job_required_experience?.required_experience_in_months
        ? `${Math.round(job.job_required_experience.required_experience_in_months / 12)}+ years`
        : 'Not specified',
      salary: job.job_min_salary && job.job_max_salary
        ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
        : 'Salary not disclosed',
      jobType: job.job_employment_type || 'Full-time',
      applyUrl: job.job_apply_link,
      source: job.job_publisher || 'External',
      companyLogo: job.employer_logo || null,
      isExternal: true,
      requirements: job.job_highlights?.Qualifications || [],
      tags: [
        job.job_is_remote ? 'Remote' : job.job_city || 'On-site',
        job.job_employment_type || 'Full-time',
      ].filter(Boolean),
    }));
    res.json(await persistJobs({ jobs, total: jobs.length, source: 'jsearch' }));
  } catch (error) {
    console.error('JSearch API error:', error.message);
    res.json(await persistJobs(getMockJobs()));
  }
});

const SOURCE_ALIASES = [
  ['naukri', 'Naukri'],
  ['linkedin', 'LinkedIn'],
  ['indeed', 'Indeed'],
  ['glassdoor', 'Glassdoor'],
];

function normalizeSource(source = '') {
  const normalized = source.toString().toLowerCase();
  return SOURCE_ALIASES.find(([needle]) => normalized.includes(needle))?.[1] || 'External';
}

async function persistJobs(payload) {
  try {
    const jobs = await Promise.all((payload.jobs || []).map(async (job) => {
    const externalId = job._id?.toString()
      || [job.source, job.company, job.title, job.applyUrl].filter(Boolean).join('|').toLowerCase();
    const update = {
      externalId,
      title: job.title || 'Untitled Job',
      company: job.company || 'Unknown Company',
      description: job.description || 'No description available.',
      salary: job.salary || 'Salary not disclosed',
      location: job.location || 'India',
      source: normalizeSource(job.source),
      experience: job.experience || '',
      jobType: job.jobType || 'Full-time',
      companyLogo: job.companyLogo || null,
      isExternal: true,
      applyUrl: job.applyUrl || null,
      requirements: job.requirements || [],
      tags: job.tags || [],
    };

    const saved = await Job.findOneAndUpdate(
      { externalId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return saved;
  }));

    return { ...payload, jobs, total: jobs.length };
  } catch (error) {
    // If MongoDB is unavailable, return the jobs without persisting
    console.warn('Could not persist jobs to DB:', error.message);
    return payload;
  }
}

function getMockJobs() {
  return {
    source: 'mock',
    total: 15,
    jobs: [
      { _id: 'ext_1', title: 'Full Stack Developer', company: 'Infosys', location: 'Bengaluru, India', salary: '₹8L - ₹15L per annum', experience: '2-4 years', jobType: 'Full-time', source: 'Naukri', isExternal: true, applyUrl: 'https://www.naukri.com/full-stack-developer-jobs', description: 'Work on enterprise-grade web applications using React and Node.js. Collaborate with cross-functional teams to deliver high-quality software solutions for global clients. You will be responsible for designing, developing, and maintaining scalable web applications, writing clean and efficient code, and participating in code reviews. Strong understanding of RESTful APIs, databases, and cloud deployment required.', requirements: ['React.js', 'Node.js', 'MongoDB', 'REST APIs', 'Git'], tags: ['React', 'Node.js', 'Bengaluru'] },
      { _id: 'ext_2', title: 'Data Scientist', company: 'TCS', location: 'Hyderabad, India', salary: '₹10L - ₹20L per annum', experience: '3-5 years', jobType: 'Full-time', source: 'Naukri', isExternal: true, applyUrl: 'https://www.naukri.com/data-scientist-jobs', description: 'Analyze large datasets and build machine learning models to drive business insights. You will work on predictive modeling, statistical analysis, and data visualization to help business stakeholders make data-driven decisions. Experience with Python, TensorFlow, and SQL required. Collaborate with data engineers and business analysts to deliver end-to-end ML solutions.', requirements: ['Python', 'TensorFlow', 'SQL', 'Pandas', 'Scikit-learn'], tags: ['Python', 'ML', 'Hyderabad'] },
      { _id: 'ext_3', title: 'DevOps Engineer', company: 'Wipro', location: 'Pune, India', salary: '₹12L - ₹22L per annum', experience: '3-6 years', jobType: 'Full-time', source: 'Naukri', isExternal: true, applyUrl: 'https://www.naukri.com/devops-engineer-jobs', description: 'Manage CI/CD pipelines, cloud infrastructure on AWS/Azure, and containerization using Docker and Kubernetes. You will automate deployment processes, monitor system performance, ensure high availability, and collaborate with development teams to streamline software delivery. Experience with infrastructure-as-code tools like Terraform is a plus.', requirements: ['AWS/Azure', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform'], tags: ['AWS', 'Docker', 'Kubernetes'] },
      { _id: 'ext_4', title: 'React Native Developer', company: 'Swiggy', location: 'Bengaluru, India', salary: '₹15L - ₹28L per annum', experience: '2-5 years', jobType: 'Full-time', source: 'LinkedIn', isExternal: true, applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=React+Native+Developer+Swiggy', description: 'Build and maintain cross-platform mobile applications for millions of users. You will develop new features, optimize performance, and ensure a seamless user experience across iOS and Android platforms. Strong knowledge of React Native, Redux, and REST APIs required. Experience with push notifications, deep linking, and app store deployment preferred.', requirements: ['React Native', 'Redux', 'iOS', 'Android', 'REST APIs'], tags: ['React Native', 'Mobile', 'Remote Friendly'] },
      { _id: 'ext_5', title: 'Backend Engineer (Java)', company: 'Flipkart', location: 'Bengaluru, India', salary: '₹18L - ₹35L per annum', experience: '4-7 years', jobType: 'Full-time', source: 'LinkedIn', isExternal: true, applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=Backend+Engineer+Java+Flipkart', description: "Design and develop scalable backend services for India's largest e-commerce platform. You will architect microservices, optimize database queries, and build high-throughput APIs that handle millions of requests daily. Experience with Java, Spring Boot, and microservices architecture required. Knowledge of distributed systems and event-driven architecture is a plus.", requirements: ['Java', 'Spring Boot', 'Microservices', 'MySQL', 'Kafka'], tags: ['Java', 'Spring Boot', 'Microservices'] },
      { _id: 'ext_6', title: 'UI/UX Designer', company: 'Zomato', location: 'Gurugram, India', salary: '₹8L - ₹16L per annum', experience: '2-4 years', jobType: 'Full-time', source: 'Naukri', isExternal: true, applyUrl: 'https://www.naukri.com/ui-ux-designer-jobs', description: 'Create intuitive and visually appealing user interfaces for web and mobile products. You will conduct user research, create wireframes and prototypes, and collaborate with product and engineering teams to deliver exceptional user experiences. Proficiency in Figma and Adobe XD required. Experience with design systems and accessibility standards preferred.', requirements: ['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'Design Systems'], tags: ['Figma', 'UI/UX', 'Gurugram'] },
      { _id: 'ext_7', title: 'Cloud Solutions Architect', company: 'Amazon India', location: 'Hyderabad, India', salary: '₹25L - ₹45L per annum', experience: '6-10 years', jobType: 'Full-time', source: 'LinkedIn', isExternal: true, applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=Cloud+Solutions+Architect+Amazon', description: 'Design and implement cloud-native solutions on AWS. Work with enterprise clients to migrate workloads, optimize cloud infrastructure, and reduce costs. You will lead technical discussions, create architecture diagrams, and ensure best practices for security and scalability. AWS certification required.', requirements: ['AWS Certified', 'Cloud Architecture', 'Terraform', 'Security', 'Cost Optimization'], tags: ['AWS', 'Cloud', 'Architecture'] },
      { _id: 'ext_8', title: 'Product Manager', company: 'Razorpay', location: 'Bengaluru, India', salary: '₹20L - ₹40L per annum', experience: '3-6 years', jobType: 'Full-time', source: 'Indeed', isExternal: true, applyUrl: 'https://in.indeed.com/jobs?q=Product+Manager+Razorpay', description: 'Drive product strategy for our payments platform. Define product roadmap, gather requirements from stakeholders, and work with engineering and design teams to deliver features used by millions of merchants. You will analyze metrics, run A/B tests, and continuously improve the product. Fintech experience preferred.', requirements: ['Product Strategy', 'Agile', 'Data Analysis', 'Stakeholder Management', 'Fintech'], tags: ['Product', 'Fintech', 'Bengaluru'] },
      { _id: 'ext_9', title: 'Machine Learning Engineer', company: 'Google India', location: 'Hyderabad, India', salary: '₹30L - ₹60L per annum', experience: '4-8 years', jobType: 'Full-time', source: 'LinkedIn', isExternal: true, applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=Machine+Learning+Engineer+Google', description: 'Build and deploy ML models at scale. Work on NLP, computer vision, and recommendation systems that power Google products used by billions of users. You will design ML pipelines, optimize model performance, and collaborate with research scientists to bring cutting-edge AI to production.', requirements: ['TensorFlow/PyTorch', 'Python', 'MLOps', 'NLP/CV', 'Distributed Systems'], tags: ['ML', 'Python', 'TensorFlow'] },
      { _id: 'ext_10', title: 'Android Developer', company: 'Paytm', location: 'Noida, India', salary: '₹12L - ₹24L per annum', experience: '2-5 years', jobType: 'Full-time', source: 'Naukri', isExternal: true, applyUrl: 'https://www.naukri.com/android-developer-jobs', description: "Develop and maintain Android applications for India's leading digital payments platform serving 300M+ users. You will build new features, improve app performance, and ensure a smooth payment experience. Strong knowledge of Kotlin, Jetpack Compose, and Android architecture patterns required.", requirements: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Coroutines', 'Payment SDKs'], tags: ['Android', 'Kotlin', 'Noida'] },
      { _id: 'ext_11', title: 'Frontend Engineer (React)', company: 'CRED', location: 'Bengaluru, India', salary: '₹18L - ₹32L per annum', experience: '3-5 years', jobType: 'Full-time', source: 'Glassdoor', isExternal: true, applyUrl: 'https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=Frontend+Engineer+CRED', description: "Build beautiful, performant web experiences for CRED's premium user base of 10M+ members. You will work on complex UI components, optimize web performance, and collaborate with designers to implement pixel-perfect interfaces. Deep expertise in React, TypeScript, and modern CSS required.", requirements: ['React', 'TypeScript', 'CSS-in-JS', 'Performance Optimization', 'Testing'], tags: ['React', 'TypeScript', 'Bengaluru'] },
      { _id: 'ext_12', title: 'Data Engineer', company: 'PhonePe', location: 'Bengaluru, India', salary: '₹15L - ₹28L per annum', experience: '3-6 years', jobType: 'Full-time', source: 'Glassdoor', isExternal: true, applyUrl: 'https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=Data+Engineer+PhonePe', description: 'Design and build data pipelines processing billions of transactions daily. You will architect real-time and batch data processing systems, maintain data quality, and enable analytics teams with reliable data infrastructure. Experience with Spark, Kafka, and cloud data warehouses required.', requirements: ['Apache Spark', 'Kafka', 'Python/Scala', 'BigQuery/Redshift', 'Airflow'], tags: ['Spark', 'Kafka', 'Data'] },
      { _id: 'ext_13', title: 'Cybersecurity Analyst', company: 'HCL Technologies', location: 'Chennai, India', salary: '₹8L - ₹18L per annum', experience: '2-5 years', jobType: 'Full-time', source: 'Indeed', isExternal: true, applyUrl: 'https://in.indeed.com/jobs?q=Cybersecurity+Analyst+HCL', description: 'Monitor and protect enterprise systems from cyber threats for Fortune 500 clients. You will conduct vulnerability assessments, respond to security incidents, implement security controls, and ensure compliance with industry standards. Experience with SIEM tools and penetration testing required.', requirements: ['SIEM Tools', 'Penetration Testing', 'ISO 27001', 'Incident Response', 'CEH/CISSP'], tags: ['Security', 'SIEM', 'Chennai'] },
      { _id: 'ext_14', title: 'Blockchain Developer', company: 'Polygon', location: 'Remote, India', salary: '₹20L - ₹40L per annum', experience: '2-4 years', jobType: 'Full-time', source: 'LinkedIn', isExternal: true, applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=Blockchain+Developer+Polygon', description: "Build decentralized applications and smart contracts on Polygon's blockchain infrastructure used by 1M+ developers. You will develop and audit smart contracts, build Web3 integrations, and contribute to the Polygon ecosystem. Expertise in Solidity and Web3.js required.", requirements: ['Solidity', 'Web3.js/Ethers.js', 'Smart Contract Auditing', 'DeFi', 'IPFS'], tags: ['Blockchain', 'Solidity', 'Remote'] },
      { _id: 'ext_15', title: 'QA Automation Engineer', company: 'Freshworks', location: 'Chennai, India', salary: '₹8L - ₹16L per annum', experience: '2-4 years', jobType: 'Full-time', source: 'Naukri', isExternal: true, applyUrl: 'https://www.naukri.com/qa-automation-engineer-jobs', description: 'Build and maintain automated test suites for SaaS products used by 60,000+ businesses globally. You will design test strategies, implement automation frameworks, integrate tests into CI/CD pipelines, and ensure product quality across web and mobile platforms.', requirements: ['Selenium/Cypress', 'Java/Python', 'CI/CD', 'API Testing', 'JIRA'], tags: ['QA', 'Selenium', 'Automation'] },
    ],
  };
}

export default router;
