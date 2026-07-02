import { useMemo, useState } from 'react';
import ApiService from '../services/ApiService';

const fieldClass = 'w-full px-[18px] py-[15px] border-2 border-gray-200 rounded-xl text-base text-gray-700 bg-gray-50 transition-all duration-200 font-[inherit] outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(102,126,234,0.12)] disabled:opacity-70 disabled:cursor-not-allowed';
const labelClass = 'text-[15px] font-bold text-gray-700';

const TEMPLATE_OPTIONS = [
  { value: 'fresher', label: 'Fresher Form' },
  { value: 'experienced', label: 'Experienced Form' },
  { value: 'software', label: 'IT / Software Form' },
  { value: 'internship', label: 'Internship Form' },
  { value: 'universal', label: 'Universal Form' },
];

const EXPERIENCE_OPTIONS = [
  'Fresher (0 years)',
  '0-1 years',
  '1-2 years',
  '2-4 years',
  '4-6 years',
  '6-10 years',
  '10+ years',
];

const FIELD_LABELS = {
  name: 'Full Name',
  email: 'Email Address',
  phone: 'Mobile Number',
  alternatePhone: 'Alternate Contact Number',
  dateOfBirth: 'Date of Birth',
  parentName: "Father's/Mother's Name",
  gender: 'Gender',
  nationality: 'Nationality',
  maritalStatus: 'Marital Status',
  currentAddress: 'Current Address',
  permanentAddress: 'Permanent Address',
  address: 'Address',
  positionAppliedFor: 'Position Applied For',
  department: 'Department',
  preferredWorkLocation: 'Preferred Work Location',
  expectedSalary: 'Expected Salary',
  availability: 'Notice Period / Availability to Join',
  employmentType: 'Employment Type',
  careerObjective: 'Career Objective',
  academicProjects: 'Academic Projects',
  programmingLanguages: 'Programming Languages',
  softwareTools: 'Software/Tools Known',
  frameworks: 'Frameworks',
  databases: 'Databases',
  cloudDevOps: 'Cloud/DevOps Tools',
  certifications: 'Certifications',
  achievements: 'Achievements',
  languagesKnown: 'Languages Known',
  previousCompany: 'Company Name',
  previousDesignation: 'Designation',
  previousDuration: 'Duration',
  keyResponsibilities: 'Key Responsibilities',
  linkedIn: 'LinkedIn Profile',
  portfolio: 'GitHub/Portfolio Link',
  currentLocation: 'Current Location',
  preferredTechnologyDomain: 'Preferred Technology Domain',
  collegeName: 'College/University Name',
  courseBranch: 'Course/Branch',
  yearOfStudy: 'Year of Study',
  internshipDuration: 'Internship Duration',
  preferredStartDate: 'Preferred Start Date',
  internshipMode: 'Mode',
  communicationSkills: 'Communication Skills',
  projectsWorkshops: 'Projects / Workshops',
  references: 'References',
  coverLetter: 'Cover Letter',
  declarationPlace: 'Place',
};

const COMMON_PERSONAL = ['name', 'email', 'phone'];

const FORM_TEMPLATES = {
  fresher: {
    title: 'Fresher Job Application Form',
    sections: [
      { title: 'Personal Information', fields: ['name', 'dateOfBirth', 'phone', 'email', 'address'] },
      { title: 'Career Objective', fields: ['careerObjective'] },
      { title: 'Educational Details', fields: ['education10', 'education12', 'educationGraduation'] },
      { title: 'Academic Projects', fields: ['academicProjects'] },
      { title: 'Technical Skills', fields: ['programmingLanguages', 'softwareTools', 'certifications'] },
      { title: 'Declaration', fields: ['declarationPlace'] },
    ],
  },
  experienced: {
    title: 'Professional Job Application Form',
    sections: [
      { title: 'A. Personal Information', fields: ['name', 'parentName', 'dateOfBirth', 'gender', 'nationality', 'maritalStatus', 'phone', 'alternatePhone', 'email', 'currentAddress', 'permanentAddress'] },
      { title: 'B. Position Details', fields: ['positionAppliedFor', 'department', 'preferredWorkLocation', 'expectedSalary', 'availability', 'employmentType'] },
      { title: 'C. Educational Qualifications', fields: ['educationHighest', 'educationPostGraduation'] },
      { title: 'D. Previous Employment Details', fields: ['previousCompany', 'previousDesignation', 'previousDuration', 'keyResponsibilities'] },
      { title: 'E. Skills & Certifications', fields: ['programmingLanguages', 'softwareTools', 'languagesKnown', 'certifications', 'achievements'] },
      { title: 'F. References', fields: ['references'] },
      { title: 'G. Declaration', fields: ['declarationPlace'] },
    ],
  },
  software: {
    title: 'IT / Software Job Application Form',
    sections: [
      { title: 'Applicant Details', fields: ['name', 'phone', 'email', 'linkedIn', 'portfolio', 'currentLocation'] },
      { title: 'Position Information', fields: ['positionAppliedFor', 'preferredTechnologyDomain', 'preferredWorkLocation', 'expectedSalary', 'availability'] },
      { title: 'Educational Background', fields: ['educationHighest', 'educationPostGraduation'] },
      { title: 'Technical Skills', fields: ['programmingLanguages', 'frameworks', 'databases', 'cloudDevOps', 'softwareTools'] },
      { title: 'Internship / Experience', fields: ['previousCompany', 'previousDesignation', 'previousDuration', 'keyResponsibilities'] },
      { title: 'Declaration', fields: ['declarationPlace'] },
    ],
  },
  internship: {
    title: 'Internship Application Form',
    sections: [
      { title: 'Student Details', fields: ['name', 'collegeName', 'courseBranch', 'yearOfStudy', 'phone', 'email'] },
      { title: 'Internship Details', fields: ['positionAppliedFor', 'internshipDuration', 'preferredStartDate', 'internshipMode'] },
      { title: 'Academic Information', fields: ['semesterCgpa', 'educationHighest'] },
      { title: 'Skills', fields: ['programmingLanguages', 'communicationSkills', 'certifications'] },
      { title: 'Projects / Workshops', fields: ['projectsWorkshops'] },
      { title: 'Declaration', fields: ['declarationPlace'] },
    ],
  },
  universal: {
    title: 'Universal Job Application Template',
    sections: [
      { title: 'Personal Information', fields: ['name', 'phone', 'email', 'address'] },
      { title: 'Job Details', fields: ['positionAppliedFor', 'expectedSalary', 'availability'] },
      { title: 'Education', fields: ['educationHighest', 'educationPostGraduation'] },
      { title: 'Experience', fields: ['previousCompany', 'previousDesignation', 'previousDuration'] },
      { title: 'Skills', fields: ['programmingLanguages', 'softwareTools'] },
      { title: 'Declaration', fields: ['declarationPlace'] },
    ],
  },
};

const inferTemplate = (job) => {
  const text = `${job?.title || ''} ${job?.jobType || ''} ${job?.tags?.join(' ') || ''}`.toLowerCase();
  if (text.includes('intern')) return 'internship';
  if (/(software|developer|engineer|react|node|java|python|data|cloud|devops|qa|android|frontend|backend|full stack)/.test(text)) return 'software';
  return 'experienced';
};

const isTextArea = (name) => [
  'address',
  'currentAddress',
  'permanentAddress',
  'careerObjective',
  'academicProjects',
  'keyResponsibilities',
  'references',
  'coverLetter',
  'projectsWorkshops',
].includes(name) || name.startsWith('education') || name === 'semesterCgpa';

const getInputType = (name) => {
  if (name === 'email') return 'email';
  if (name === 'phone' || name === 'alternatePhone') return 'tel';
  if (name === 'dateOfBirth' || name === 'preferredStartDate') return 'date';
  return 'text';
};

const createInitialForm = (currentUser, job) => ({
  name: currentUser?.name || '',
  email: currentUser?.email || '',
  phone: '',
  experience: '',
  applicationType: inferTemplate(job),
  positionAppliedFor: job?.title || '',
  preferredWorkLocation: job?.location || '',
  expectedSalary: '',
  coverLetter: '',
});

const ApplyModal = ({ job, onClose, currentUser, onApply }) => {
  const [form, setForm] = useState(() => createInitialForm(currentUser, job));
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const template = useMemo(
    () => FORM_TEMPLATES[form.applicationType] || FORM_TEMPLATES.experienced,
    [form.applicationType]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'experience' && value === 'Fresher (0 years)') {
        next.applicationType = 'fresher';
      } else if (name === 'experience' && prev.applicationType === 'fresher') {
        next.applicationType = inferTemplate(job) === 'software' ? 'software' : 'experienced';
      }
      return next;
    });
  };

  const validate = () => {
    if (!form.applicationType) return 'Please select an application form.';
    if (!form.name?.trim()) return 'Full name is required.';
    if (!form.email?.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.experience) return 'Please select your experience level.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await ApiService.applyToJob({
        name: form.name,
        email: form.email,
        phone: form.phone,
        experience: form.experience,
        coverLetter: form.coverLetter,
        applicationType: form.applicationType,
        applicationDetails: form,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        jobId: job._id || job.id,
      });

      setSuccess(result.message || 'Application submitted!');
      if (result.previewUrl) setPreviewUrl(result.previewUrl);
      if (onApply) onApply(job.id || job._id);
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (fieldName) => {
    const label = FIELD_LABELS[fieldName] || fieldName;
    const isRequired = COMMON_PERSONAL.includes(fieldName);

    return (
      <div className="flex flex-col gap-2.5" key={fieldName}>
        <label className={labelClass}>
          {label}{isRequired ? ' *' : ''}
        </label>
        {isTextArea(fieldName) ? (
          <textarea
            name={fieldName}
            value={form[fieldName] || ''}
            onChange={handleChange}
            rows={fieldName.startsWith('education') || fieldName === 'semesterCgpa' ? 3 : 4}
            placeholder={`Enter ${label.toLowerCase()}`}
            required={isRequired}
            disabled={loading}
            className={`${fieldClass} min-h-[112px] resize-y`}
          />
        ) : (
          <input
            type={getInputType(fieldName)}
            name={fieldName}
            value={form[fieldName] || ''}
            onChange={handleChange}
            placeholder={`Enter ${label.toLowerCase()}`}
            required={isRequired}
            disabled={loading}
            className={fieldClass}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/65 p-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[860px] max-h-[92vh] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.42)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-5 top-5 z-10 flex h-[46px] w-[46px] items-center justify-center rounded-full border-none bg-white/95 text-[32px] leading-none text-gray-500 shadow-sm transition-all duration-200 hover:rotate-90 hover:bg-gray-50 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close application form"
        >
          &times;
        </button>

        <div
          className="rounded-t-[28px] px-10 pb-8 pt-9 max-sm:px-6"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <h2 className="m-0 mb-3 pr-14 text-[28px] font-extrabold leading-tight text-white max-sm:text-2xl">
            Apply for {job.title}
          </h2>
          <p className="m-0 text-base text-white/90">
            at <strong>{job.company}</strong> &middot; {job.location}
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 px-10 py-10 text-center max-sm:px-6">
            <div className="text-[56px]">OK</div>
            <h3 className="m-0 text-[24px] font-extrabold text-green-900">Application Submitted!</h3>
            <p className="m-0 text-[15px] text-gray-600">{success}</p>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white no-underline shadow-[0_6px_18px_rgba(102,126,234,0.4)] transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
              >
                View Confirmation Email
              </a>
            ) : (
              <p className="m-0 text-[13px] text-gray-400">Confirmation sent to <strong>{form.email}</strong></p>
            )}
            <button
              type="button"
              className="mt-2 w-full rounded-xl border-none px-6 py-4 text-base font-bold text-white shadow-[0_8px_22px_rgba(102,126,234,0.35)] transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-7 px-10 py-10 max-sm:px-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <div className="flex flex-col gap-2.5">
                <label className={labelClass}>Application Form *</label>
                <select
                  name="applicationType"
                  value={form.applicationType}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className={fieldClass}
                >
                  {TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2.5">
                <label className={labelClass}>Years of Experience *</label>
                <select
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className={fieldClass}
                >
                  <option value="">Select experience</option>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4">
              <h3 className="m-0 text-lg font-extrabold text-indigo-950">{template.title}</h3>
              <p className="m-0 mt-1 text-sm text-indigo-700">
                The fields below follow the selected PDF application format.
              </p>
            </div>

            {template.sections.map((section) => (
              <section className="flex flex-col gap-4" key={section.title}>
                <h4 className="m-0 border-b border-gray-200 pb-2 text-base font-extrabold text-gray-800">
                  {section.title}
                </h4>
                <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                  {section.fields.map(renderField)}
                </div>
              </section>
            ))}

            <div className="flex flex-col gap-2.5">
              <label className={labelClass}>Cover Letter</label>
              <textarea
                name="coverLetter"
                value={form.coverLetter || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Tell us why you're a great fit..."
                disabled={loading}
                className={`${fieldClass} min-h-[132px] resize-y`}
              />
            </div>

            {/* ── Resume / Document Upload ── */}
            <div className="flex flex-col gap-2.5">
              <label className={labelClass}>Resume / CV <span className="text-gray-400 font-normal text-sm">(PDF, DOC, DOCX — max 5 MB)</span></label>
              <label
                className={`flex flex-col items-center justify-center gap-3 w-full min-h-[120px] rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  resumeFile
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40'
                } ${loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setError('File is too large. Maximum size is 5 MB.');
                      e.target.value = '';
                      return;
                    }
                    setResumeFile(file);
                    setError('');
                  }}
                />
                {resumeFile ? (
                  <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                    <span className="text-3xl">📄</span>
                    <span className="text-sm font-bold text-indigo-700 break-all">{resumeFile.name}</span>
                    <span className="text-xs text-gray-400">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      className="mt-1 text-xs text-red-500 hover:text-red-700 font-semibold bg-transparent border-none cursor-pointer"
                      onClick={(e) => { e.preventDefault(); setResumeFile(null); }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 px-4 text-center pointer-events-none">
                    <span className="text-3xl">📎</span>
                    <span className="text-sm font-semibold text-gray-600">Click to upload your resume</span>
                    <span className="text-xs text-gray-400">PDF, DOC or DOCX</span>
                  </div>
                )}
              </label>
            </div>

            {error && (
              <div className="rounded-xl border-l-4 border-red-400 bg-red-100 px-5 py-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-none px-6 py-4 text-lg font-extrabold text-white shadow-[0_10px_24px_rgba(102,126,234,0.4)] transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_14px_32px_rgba(102,126,234,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Apply Now via TINCLO</>
              )}
            </button>

            <p className="m-0 text-center text-sm text-gray-400">
              A confirmation email will be sent upon submission.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApplyModal;
