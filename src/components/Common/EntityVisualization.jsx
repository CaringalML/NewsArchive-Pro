import React from 'react'
import {
  Building2,
  User,
  MapPin,
  Calendar,
  Tag,
  Trophy,
  DollarSign,
  BookOpen
} from 'lucide-react'
import './EntityVisualization.css'

const EntityVisualization = ({ entities, className = '', compact = false }) => {
  // Entity type configuration with icons, colors, and display names
  const entityConfig = {
    PERSON: {
      icon: User,
      color: '#3b82f6',
      bgColor: '#dbeafe',
      label: 'People',
      description: 'Individuals mentioned in the text'
    },
    ORGANIZATION: {
      icon: Building2,
      color: '#7c3aed',
      bgColor: '#f3e8ff',
      label: 'Organizations',
      description: 'Companies, institutions, and groups'
    },
    LOCATION: {
      icon: MapPin,
      color: '#059669',
      bgColor: '#d1fae5',
      label: 'Locations',
      description: 'Places, cities, countries, and geographic references'
    },
    DATE: {
      icon: Calendar,
      color: '#d97706',
      bgColor: '#fef3c7',
      label: 'Dates',
      description: 'Temporal references and time periods'
    },
    COMMERCIAL_ITEM: {
      icon: DollarSign,
      color: '#dc2626',
      bgColor: '#fecaca',
      label: 'Products',
      description: 'Commercial items and branded products'
    },
    EVENT: {
      icon: Trophy,
      color: '#5b21b6',
      bgColor: '#e0e7ff',
      label: 'Events',
      description: 'Meetings, conferences, and significant occurrences'
    },
    TITLE: {
      icon: BookOpen,
      color: '#c53030',
      bgColor: '#fed7d7',
      label: 'Titles',
      description: 'Job titles, positions, and roles'
    },
    QUANTITY: {
      icon: Tag,
      color: '#2b6cb0',
      bgColor: '#bee3f8',
      label: 'Quantities',
      description: 'Numbers, measurements, and amounts'
    }
  }

  if (!entities || Object.keys(entities).length === 0) {
    return (
      <div className={`entity-visualization ${className}`}>
        <div className="no-entities">
          <Tag className="w-8 h-8 text-gray-400" />
          <p>No entities detected</p>
        </div>
      </div>
    )
  }


  return (
    <div className={`entity-visualization ${compact ? 'compact' : ''} ${className}`}>
      <div className="entity-types">
        {Object.entries(entities).map(([type, entityList]) => {
          const config = entityConfig[type] || entityConfig.QUANTITY
          const IconComponent = config.icon

          return (
            <div key={type} className="entity-type visible">
              <div className="entity-type-header">
                <div className="entity-type-info">
                  <div 
                    className="entity-icon"
                    style={{ 
                      backgroundColor: config.bgColor,
                      color: config.color
                    }}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="entity-type-details">
                    <div className="entity-type-label">
                      <span className="entity-type-count">
                        ({entityList.length})
                      </span>
                      <span>{config.label}</span>
                    </div>
                    {!compact && (
                      <span className="entity-type-description">
                        {config.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="entity-list">
                {entityList.map((entity, index) => (
                  <div
                    key={index}
                    className="entity-item"
                  >
                    <span className="entity-text">{entity}</span>
                    <div className="entity-indicator" />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {compact && (
        <div className="entity-summary">
          <div className="entity-type-indicators">
            {Object.entries(entities).map(([type, entityList]) => {
              const config = entityConfig[type] || entityConfig.QUANTITY
              const IconComponent = config.icon
              
              return (
                <div
                  key={type}
                  className="entity-type-indicator"
                  style={{ backgroundColor: config.bgColor, color: config.color }}
                  title={`${config.label}: ${entityList.length}`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{entityList.length}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default EntityVisualization