import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

import type { CareerTrack, EducationLevel } from '../../engine/types';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);

  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [level, setLevel] = useState<EducationLevel>(profile.education?.level || 'UNDERGRADUATE');
  const [field, setField] = useState(profile.education?.field || 'Computer Science & Engineering');
  const [year, setYear] = useState(profile.education?.year || '2nd Year');
  const [careerTrack, setCareerTrack] = useState<CareerTrack>(profile.education?.careerTrack || 'TECH_SOFTWARE');
  const [targetRole, setTargetRole] = useState(profile.education?.targetRole || 'Software Engineering Intern');

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateName = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setNameError('Please enter your name.');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return false;
    }
    if (trimmed.length > 60) {
      setNameError('Name cannot exceed 60 characters.');
      return false;
    }
    setNameError(null);
    return true;
  };

  const validateEmail = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com).');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateField = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setFieldError('Please enter your major or course of study.');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isFieldValid = validateField(field);

    if (isNameValid && isEmailValid && isFieldValid) {
      setSubmitting(true);
      setProfile({
        name: name.trim(),
        email: email.trim(),
        education: {
          level,
          field: field.trim(),
          year,
          careerTrack,
          targetRole: targetRole.trim() || undefined,
        },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate('/setup/income');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="panel p-6 sm:p-8 md:p-10"
    >
      <div className="mb-8">
        <span className="eyebrow">Welcome to CalmCap</span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-semibold text-ink mt-2 leading-tight">
          Turn "I want to be a millionaire" into a plan you can stick with.
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Designed for your first rupee. We build a clear, calm path of outcomes and test your plan against market falls before you begin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name-input" className="label block mb-1">
              Your name
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(name)}
              aria-invalid={nameError ? 'true' : 'false'}
              aria-describedby={nameError ? 'name-error' : undefined}
              className="input"
              placeholder="e.g. Aarav"
              autoFocus
              disabled={submitting}
            />
            {nameError && (
              <p id="name-error" className="text-xs text-loss mt-1.5" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email-input" className="label block mb-1">
              Your email
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
              className="input"
              placeholder="e.g. aarav@college.edu"
              disabled={submitting}
            />
            {emailError && (
              <p id="email-error" className="text-xs text-loss mt-1.5" role="alert">
                {emailError}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted">
          Stays on this device. We don't send your information anywhere.
        </p>

        {/* Education & Career Background */}
        <div className="pt-4 border-t border-line/60 space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-accent block">
              Education & Career Context
            </span>
            <p className="text-xs text-muted mt-0.5">
              We personalize your To-Do Calendar with job preparation tasks, internship application timelines, and freelance gig opportunities tailored to your studies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="education-level" className="label block mb-1">
                Degree / Level
              </label>
              <select
                id="education-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as EducationLevel)}
                className="input"
                disabled={submitting}
              >
                <option value="UNDERGRADUATE">Undergraduate (Bachelor's)</option>
                <option value="POSTGRADUATE">Postgraduate (Master's)</option>
                <option value="DIPLOMA">Diploma / Polytechnic</option>
                <option value="HIGH_SCHOOL">High School</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="education-year" className="label block mb-1">
                Current Year / Stage
              </label>
              <select
                id="education-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="input"
                disabled={submitting}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="Final Year">Final Year</option>
                <option value="Recent Graduate">Recent Graduate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="education-field" className="label block mb-1">
                Field of Study / Major
              </label>
              <input
                id="education-field"
                type="text"
                value={field}
                onChange={(e) => {
                  setField(e.target.value);
                  if (fieldError) validateField(e.target.value);
                }}
                onBlur={() => validateField(field)}
                aria-invalid={fieldError ? 'true' : 'false'}
                aria-describedby={fieldError ? 'field-error' : undefined}
                className="input"
                placeholder="e.g. Computer Science, Commerce, Economics"
                disabled={submitting}
              />
              {fieldError && (
                <p id="field-error" className="text-xs text-loss mt-1.5" role="alert">
                  {fieldError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="career-track" className="label block mb-1">
                Primary Career Track
              </label>
              <select
                id="career-track"
                value={careerTrack}
                onChange={(e) => setCareerTrack(e.target.value as CareerTrack)}
                className="input"
                disabled={submitting}
              >
                <option value="TECH_SOFTWARE">Tech & Software Engineering</option>
                <option value="FINANCE_COMMERCE">Finance, Banking & Accounting</option>
                <option value="BUSINESS_MARKETING">Business, Marketing & Operations</option>
                <option value="DESIGN_CREATIVE">Design, UI/UX & Creative</option>
                <option value="GENERAL_CORPORATE">Corporate Careers & Research</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="target-role" className="label block mb-1">
              Target Role or Internship Goal <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="target-role"
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="input"
              placeholder="e.g. Software Engineering Intern, Financial Analyst, Freelance Designer"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:flex-1 h-11 rounded-ctl bg-accent text-on-accent font-medium text-base hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            Continue to Plan Setup
          </button>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              useStore.getState().loadDemoData();
              navigate('/app/dashboard');
            }}
            className="w-full sm:w-auto px-5 h-11 rounded-ctl border border-line bg-surface hover:bg-surface-2 text-ink font-medium text-sm transition-colors"
          >
            Explore Demo Dashboard
          </button>
        </div>
      </form>
    </motion.div>
  );
};
