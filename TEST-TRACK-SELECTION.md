# Student Track Selection Testing Guide

## Setup
1. Make sure dev server is running: `npm run dev`
2. Open browser to http://localhost:3000

## Test Account
- Email: `12@123.com`
- Password: (your test password)

## Test Flow 1: Questionnaire Path

### Step 1: Login as Student
1. Navigate to http://localhost:3000/login
2. Login with `12@123.com`
3. You should land on student dashboard

### Step 2: Navigate to Track Selection
1. From student dashboard, you should see a "Choose Your Learning Track" CTA if no track is selected
2. Click "Take Questionnaire" button
3. URL should be: http://localhost:3000/student/track-selection/questionnaire

### Step 3: Complete Questionnaire
Test the following questionnaire fields:

#### Basic Information:
- **Time Commitment**: Test different hour ranges (5, 10, 20 hours/week)
- **Current Skill Level**: Beginner / Intermediate / Advanced
- **Learning Goals**: Select multiple goals from the list

#### Learning Preferences:
- **Learning Pace**: Slow / Normal / Fast
- **Content Format**: Video / Text / Interactive (multiple selection)
- **Difficulty Preference**: Easy / Progressive / Challenging

#### Interest Areas:
- Select focus areas (Frontend, Backend, Full Stack, etc.)
- Rate interest level for each area

### Step 4: Submit Questionnaire
1. Click "Get Track Recommendations"
2. Should redirect to track selection page with personalized recommendations
3. Check browser console for any errors

### Step 5: Select Recommended Track
1. Review recommended tracks (should show confidence scores)
2. Click "Select Track" on a recommended track
3. Verify assignment is created (check database or UI feedback)

## Test Flow 2: Direct Track Selection (No Questionnaire)

### Step 1: Navigate Directly
1. Go to http://localhost:3000/student/track-selection
2. Click "Browse Tracks" instead of questionnaire

### Step 2: Browse All Tracks
1. Should see all available tracks
2. Each track should show:
   - Title
   - Description
   - Focus Area
   - Number of courses
   - Estimated duration

### Step 3: Select Track Manually
1. Click "Select Track" on any track
2. Assignment type should be "manual" (vs "questionnaire")
3. Verify assignment is created

## Test Flow 3: Multiple Track Selection

### Test Secondary Track
1. After selecting primary track
2. Try selecting another track as "secondary"
3. Verify both assignments exist with correct types

## Database Verification

Run these queries to verify data:

```sql
-- Check if preferences were saved
SELECT * FROM student_preferences
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = '12@123.com'
);

-- Check track assignments
SELECT * FROM student_track_assignments
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = '12@123.com'
);

-- Check if questionnaire was marked complete
SELECT completed_questionnaire, questionnaire_completed_at
FROM student_preferences
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = '12@123.com'
);
```

## UI Elements to Verify

### On Student Dashboard (/student):
- [ ] "Choose Your Learning Track" CTA appears if no track selected
- [ ] "Your Learning Tracks" section appears after track selection
- [ ] Track progress percentage displays correctly
- [ ] "Manage Tracks" button works

### On Track Selection (/student/track-selection):
- [ ] All tracks load and display
- [ ] Filter/search functionality works
- [ ] Track cards show all required information
- [ ] "Already Enrolled" badge appears on selected tracks

### On Questionnaire (/student/track-selection/questionnaire):
- [ ] All form fields are functional
- [ ] Validation works (required fields)
- [ ] Progress indicator (if implemented)
- [ ] Submit button enables only when form is valid

## Common Issues to Check

1. **RLS Policies**: Student should only see/modify their own data
2. **Duplicate Assignments**: Shouldn't create duplicate primary track assignments
3. **Confidence Scores**: Should be higher for questionnaire-based selections
4. **Recommendations**: Should be personalized based on questionnaire answers

## Expected Behaviors

### After Questionnaire Submission:
- `student_preferences` table updated with answers
- `completed_questionnaire` = true
- Redirects to track selection with recommendations

### After Track Selection:
- `student_track_assignments` created
- Dashboard shows selected track(s)
- Recommended courses appear based on track

## Error Scenarios to Test

1. **Submit empty questionnaire** - Should show validation errors
2. **Select same track twice** - Should prevent or update existing
3. **Network failure during submission** - Should show error message
4. **Logout/login after selection** - Track should persist

## Console Commands for Testing

```javascript
// Check local storage for any cached data
localStorage.getItem('track-selection-draft')

// Check current user
(await supabase.auth.getUser()).data.user

// Manually fetch assignments
const { data } = await supabase
  .from('student_track_assignments')
  .select('*')
  .eq('student_id', userId)

console.log(data)
```

## Reset Test Data

If you need to reset and test again:

```sql
-- Delete all test student's track data
DELETE FROM student_track_assignments
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = '12@123.com'
);

DELETE FROM student_preferences
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = '12@123.com'
);

DELETE FROM course_recommendations
WHERE student_id IN (
  SELECT id FROM profiles WHERE email = '12@123.com'
);
```

## Success Criteria

✅ Student can complete questionnaire
✅ Preferences are saved to database
✅ Track recommendations appear based on preferences
✅ Student can select track from recommendations
✅ Student can browse and select tracks without questionnaire
✅ Track assignments are created correctly
✅ Dashboard reflects selected tracks
✅ No console errors during flow
✅ RLS policies work correctly (can't see other students' data)