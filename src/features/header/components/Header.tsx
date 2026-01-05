'use client';

/**
 * Header Component
 *
 * Application header with timeline title and action buttons.
 * Based on Spec.md Section 2.2: Component Hierarchy
 */

import { memo, useState } from 'react';
import type { Timeline } from '@/types';
import { ShareDialog } from './ShareDialog';

interface HeaderProps {
  timeline?: Timeline;
  onSave?: () => void;
  isSaving?: boolean;
  className?: string;
}

function HeaderComponent({ timeline, onSave, isSaving = false, className = '' }: HeaderProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);

  return (
    <>
      <header
        className={`flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 ${className}`}
      >
        {/* Left: Logo and title */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg
              className="h-6 w-6 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-lg font-semibold text-gray-900">Timeline</span>
          </div>

          {/* Timeline title */}
          {timeline && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-sm font-medium text-gray-900">{timeline.title}</h1>
                {timeline.description && (
                  <p className="text-xs text-gray-500">{timeline.description}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {timeline && (
            <>
              {/* Save button */}
              {onSave && (
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {isSaving ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  )}
                  Save
                </button>
              )}

              {/* Share button */}
              <button
                onClick={() => setShowShareDialog(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
            </>
          )}
        </div>
      </header>

      {/* Share dialog */}
      {timeline && (
        <ShareDialog
          timeline={timeline}
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </>
  );
}

export const Header = memo(HeaderComponent);
