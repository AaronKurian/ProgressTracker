import React, { useState } from 'react'
import { FileText, Send, Link } from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/api'

const Submit = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    url: ''
  })

  const extractAllTitleSlugs = (text) => {
    try {
      const titleSlugs = new Set() // Use Set to avoid duplicates
      
      // Clean the text - remove extra spaces and normalize
      const cleanedText = text.trim().replace(/\s+/g, ' ')
      
      // Pattern 1: Extract from full LeetCode URLs
      const urlRegex = /leetcode\.com\/problems\/([a-zA-Z0-9\-]+)/g
      let urlMatch
      while ((urlMatch = urlRegex.exec(cleanedText)) !== null) {
        if (urlMatch[1] && urlMatch[1].length > 0) {
          titleSlugs.add(urlMatch[1])
        }
      }
      
      // Pattern 2: Extract standalone title slugs (word-word-word format)
      // Look for sequences of words separated by hyphens
      const slugRegex = /\b([a-zA-Z]+(?:-[a-zA-Z0-9]+)+)\b/g
      let slugMatch
      while ((slugMatch = slugRegex.exec(cleanedText)) !== null) {
        const potentialSlug = slugMatch[1]
        // Filter out common false positives and ensure it looks like a LeetCode slug
        if (potentialSlug.length >= 5 && potentialSlug.length <= 50 && 
            !potentialSlug.includes('--') && // avoid double hyphens
            potentialSlug.split('-').length >= 2) { // at least 2 words
          titleSlugs.add(potentialSlug)
        }
      }
      
      return Array.from(titleSlugs)
    } catch (error) {
      console.error('Error extracting title slugs:', error)
      return []
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))    
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
    
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' })
    }
  }

  const uploadQuestion = async (titleSlug) => {
    const response = await fetch(API_ENDPOINTS.QUESTIONS_UPLOAD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ titleSlug })
    })
    return await response.json()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.url) {
      setMessage({ type: 'error', text: 'Please enter LeetCode URLs or title slugs' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Extract all title slugs from the input
      const titleSlugs = extractAllTitleSlugs(formData.url)
      console.log('Extracted Title Slugs:', titleSlugs)

      if (titleSlugs.length === 0) {
        setMessage({ 
          type: 'error', 
          text: 'No valid LeetCode URLs or title slugs found in the input.' 
        })
        return
      }

      const results = {
        successful: [],
        failed: []
      }

      // Upload each question
      for (const titleSlug of titleSlugs) {
        try {
          console.log(`Uploading: ${titleSlug}`)
          const data = await uploadQuestion(titleSlug)
          
          if (data.success) {
            results.successful.push({
              slug: titleSlug,
              title: data.data.title
            })
          } else {
            results.failed.push({
              slug: titleSlug,
              error: data.message || 'Upload failed'
            })
          }
        } catch (error) {
          results.failed.push({
            slug: titleSlug,
            error: 'Network error'
          })
        }
      }

      // Display results
      const successCount = results.successful.length
      const failCount = results.failed.length
      
      if (successCount > 0 && failCount === 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully uploaded ${successCount} question${successCount > 1 ? 's' : ''}!`
        })
        setFormData({ url: '' }) // Clear form only on complete success
        
        // Reset textarea height after clearing
        const textarea = document.querySelector('textarea[name="url"]')
        if (textarea) {
          textarea.style.height = 'auto'
        }
      } else if (successCount > 0 && failCount > 0) {
        setMessage({ 
          type: 'warning', 
          text: `Uploaded ${successCount} question${successCount > 1 ? 's' : ''}, ${failCount} failed. Check console for details.`
        })
        console.log('Failed uploads:', results.failed)
      } else {
        setMessage({ 
          type: 'error', 
          text: `Failed to upload all ${failCount} question${failCount > 1 ? 's' : ''}. Check console for details.`
        })
        console.log('Failed uploads:', results.failed)
      }

    } catch (error) {
      console.error('Error:', error)
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
        
        {/* Form Content */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Enter Question(s) !
            </h2>
            <p className="text-white/70">
              Submit one or multiple questions to the database
            </p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-500/20 border-green-500/50 text-green-300'
                : message.type === 'warning'
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-red-500/20 border-red-500/50 text-red-300'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* LeetCode URL Field */}
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <Link className="h-5 w-5 text-white/50" />
              </div>
              <textarea
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="Paste LeetCode URL or title slug here..."
                required
                disabled={loading}
                rows={1}
                style={{ 
                  minHeight: '48px',
                  maxHeight: '200px',
                  overflow: 'hidden'
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300 disabled:opacity-50 resize-none leading-tight"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formData.url}
              className="w-full bg-gray-800/30 hover:bg-gray-800/60 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-lg border border-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Processing Questions...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Question(s)</span>
                </>
              )}
            </button>
          </form>

          {/* Additional Options */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Want to go back?{' '}
              <button
                onClick={() => navigate('/questions')}
                disabled={loading}
                className="text-white hover:text-white/80 font-semibold underline transition-colors duration-200 disabled:opacity-50"
              >
                View Questions
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Submit
