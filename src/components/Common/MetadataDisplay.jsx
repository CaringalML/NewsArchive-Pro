import React, { useState } from 'react'
import { 
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import EntityVisualization from './EntityVisualization'
import './MetadataDisplay.css'

const MetadataDisplay = ({ metadata, className = '' }) => {
  const [expandedSections, setExpandedSections] = useState({
    entities: true,
    keyPhrases: false,
    sentiment: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }


  // Sentiment icon and color
  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <FaceSmileIcon className="w-5 h-5 text-green-500" />
      case 'negative':
        return <FaceFrownIcon className="w-5 h-5 text-red-500" />
      case 'neutral':
        return <MinusIcon className="w-5 h-5 text-gray-500" />
      default:
        return <ChartBarIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'sentiment-positive'
      case 'negative':
        return 'sentiment-negative'
      case 'neutral':
        return 'sentiment-neutral'
      default:
        return 'sentiment-mixed'
    }
  }

  if (!metadata) {
    return (
      <div className={`metadata-display ${className}`}>
        <div className="no-metadata">
          <SparklesIcon className="w-8 h-8 text-gray-400" />
          <p>No metadata available</p>
        </div>
      </div>
    )
  }

  // Parse metadata if it's a string
  let parsedMetadata = metadata
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata)
    } catch (e) {
      console.error('Error parsing metadata:', e)
      return (
        <div className={`metadata-display ${className}`}>
          <div className="metadata-error">
            <p>Error parsing metadata</p>
          </div>
        </div>
      )
    }
  }

  const { entities = {}, keyPhrases = [], sentiment } = parsedMetadata

  return (
    <div className={`metadata-display ${className}`}>

      {/* Entities Section */}
      {Object.keys(entities).length > 0 && (
        <div className="metadata-section">
          <button
            className="section-header"
            onClick={() => toggleSection('entities')}
          >
            {expandedSections.entities ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
            <span>Entities ({Object.values(entities).flat().length})</span>
          </button>

          {expandedSections.entities && (
            <div className="section-content">
              <EntityVisualization entities={entities} />
            </div>
          )}
        </div>
      )}

      {/* Key Phrases Section */}
      {keyPhrases.length > 0 && (
        <div className="metadata-section">
          <button
            className="section-header"
            onClick={() => toggleSection('keyPhrases')}
          >
            {expandedSections.keyPhrases ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
            <span>Key Phrases ({keyPhrases.length})</span>
          </button>

          {expandedSections.keyPhrases && (
            <div className="section-content">
              <div className="key-phrases-list">
                {keyPhrases.map((phrase, index) => (
                  <span key={index} className="key-phrase-tag">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sentiment Section */}
      {sentiment && (
        <div className="metadata-section">
          <button
            className="section-header"
            onClick={() => toggleSection('sentiment')}
          >
            {expandedSections.sentiment ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
            <span>Sentiment Analysis</span>
          </button>

          {expandedSections.sentiment && (
            <div className="section-content">
              <div className="sentiment-display">
                <div className="sentiment-main">
                  {getSentimentIcon(sentiment.overall)}
                  <span className={`sentiment-label ${getSentimentColor(sentiment.overall)}`}>
                    {sentiment.overall || 'Mixed'}
                  </span>
                  {sentiment.confidence && (
                    <span className="sentiment-confidence">
                      {Math.round(sentiment.confidence * 100)}% confidence
                    </span>
                  )}
                </div>

                {/* Sentiment breakdown if available */}
                {sentiment.positive !== undefined && (
                  <div className="sentiment-breakdown">
                    <div className="sentiment-bar">
                      <div className="sentiment-item">
                        <span className="sentiment-type">Positive</span>
                        <div className="sentiment-progress">
                          <div 
                            className="sentiment-progress-fill positive"
                            style={{ width: `${(sentiment.positive || 0) * 100}%` }}
                          />
                        </div>
                        <span className="sentiment-value">
                          {Math.round((sentiment.positive || 0) * 100)}%
                        </span>
                      </div>

                      <div className="sentiment-item">
                        <span className="sentiment-type">Negative</span>
                        <div className="sentiment-progress">
                          <div 
                            className="sentiment-progress-fill negative"
                            style={{ width: `${(sentiment.negative || 0) * 100}%` }}
                          />
                        </div>
                        <span className="sentiment-value">
                          {Math.round((sentiment.negative || 0) * 100)}%
                        </span>
                      </div>

                      <div className="sentiment-item">
                        <span className="sentiment-type">Neutral</span>
                        <div className="sentiment-progress">
                          <div 
                            className="sentiment-progress-fill neutral"
                            style={{ width: `${(sentiment.neutral || 0) * 100}%` }}
                          />
                        </div>
                        <span className="sentiment-value">
                          {Math.round((sentiment.neutral || 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show message if no metadata */}
      {Object.keys(entities).length === 0 && keyPhrases.length === 0 && !sentiment && (
        <div className="no-metadata">
          <SparklesIcon className="w-8 h-8 text-gray-400" />
          <p>No AI metadata extracted</p>
          <p className="text-sm text-gray-500">
            The document may not contain enough meaningful text for analysis
          </p>
        </div>
      )}
    </div>
  )
}

export default MetadataDisplay