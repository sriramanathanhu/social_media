# Common Pitfalls to Watch Out

<database-issues>
## PostgreSQL JSONB Queries
- **Issue**: JSONB array overlap operator errors in complex queries
- **Solution**: Use proper JSONB operators and validate query syntax
- **Example**: Fixed in X API Dashboard status endpoint queries
- **Prevention**: Always test JSONB queries in development first
</database-issues>

<frontend-patterns>
## Component Consistency
- **Issue**: Platform-specific components deviating from established patterns
- **Solution**: Always reference existing platform implementations (Mastodon, X) when adding new platforms
- **Example**: Pinterest dialog follows same pattern as ConnectMastodonDialog
- **Prevention**: Review existing components before creating new ones

## State Management
- **Issue**: Redux state not properly initialized or updated
- **Solution**: Always add new state properties to initialState and handle all async states
- **Example**: Pinterest connection state properly integrated with pending/fulfilled/rejected handlers
- **Prevention**: Follow Redux Toolkit patterns consistently
</frontend-patterns>

<authentication-flows>
## OAuth Implementation
- **Issue**: Platform-specific OAuth requirements not properly handled
- **Solution**: Each platform has unique OAuth flow requirements
- **Examples**: 
  - Mastodon requires instance URL input
  - Pinterest uses simplified OAuth without instance
  - X has specific callback URL requirements
- **Prevention**: Research each platform's OAuth documentation thoroughly
</authentication-flows>

<platform-specific-gotchas>
## Pinterest Requirements
- **Issue**: Pinterest requires images for pin creation
- **Solution**: UI should indicate image requirement for Pinterest posts
- **Prevention**: Platform-specific validation in compose component

## Character Limits
- **Issue**: Different platforms have different character limits
- **Solution**: Platform-specific character counting and validation
- **Current Implementation**: X (280), Mastodon (500), Pinterest (500)
- **Prevention**: Always check platform documentation for current limits

## API Rate Limits
- **Issue**: Different platforms have different rate limiting
- **Solution**: Implement proper rate limiting and error handling
- **Prevention**: Monitor API usage and implement backoff strategies
</platform-specific-gotchas>

<testing-considerations>
## End-to-End Testing
- **Issue**: OAuth flows difficult to test without real credentials
- **Solution**: Use development/sandbox credentials when available
- **Prevention**: Set up proper testing environment with mock services

## Database Migrations
- **Issue**: Schema changes can break existing data
- **Solution**: Always create proper migration scripts
- **Prevention**: Test migrations on development data first
</testing-considerations>

<deployment-issues>
## Environment Configuration
- **Issue**: Different environments require different API endpoints and credentials
- **Solution**: Use environment variables for all platform-specific configuration
- **Prevention**: Document all required environment variables

## CORS Configuration
- **Issue**: Frontend-backend communication blocked by CORS
- **Solution**: Proper CORS configuration for all environments
- **Prevention**: Test in production-like environment before deployment
</deployment-issues>