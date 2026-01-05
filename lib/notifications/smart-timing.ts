/**
 * Smart Notification Timing
 *
 * Analyzes user's workout history to determine optimal reminder times
 */

interface WorkoutTimeSlot {
  hour: number;
  count: number;
  dayOfWeek: number;
}

interface SmartTimingResult {
  preferredHour: number;
  preferredDays: number[];
  confidence: 'high' | 'medium' | 'low';
  suggestedReminderTime: string; // HH:MM format
  insights: string[];
}

/**
 * Analyze workout history to find optimal notification timing
 */
export function analyzeWorkoutPatterns(workouts: Array<{ startTime: string }>): SmartTimingResult {
  if (workouts.length < 3) {
    return {
      preferredHour: 18, // Default to 6pm
      preferredDays: [1, 2, 3, 4, 5], // Weekdays
      confidence: 'low',
      suggestedReminderTime: '17:00',
      insights: ['Not enough workout data yet - using defaults'],
    };
  }

  // Count workouts by hour and day
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, number> = {};
  const timeSlots: WorkoutTimeSlot[] = [];

  for (const workout of workouts) {
    const date = new Date(workout.startTime);
    const hour = date.getHours();
    const day = date.getDay();

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    timeSlots.push({ hour, count: 1, dayOfWeek: day });
  }

  // Find most common hour
  const sortedHours = Object.entries(hourCounts)
    .map(([h, c]) => ({ hour: parseInt(h), count: c }))
    .sort((a, b) => b.count - a.count);

  const preferredHour = sortedHours[0]?.hour || 18;

  // Find most common days
  const sortedDays = Object.entries(dayCounts)
    .map(([d, c]) => ({ day: parseInt(d), count: c }))
    .sort((a, b) => b.count - a.count);

  const preferredDays = sortedDays
    .filter(d => d.count >= workouts.length * 0.1) // At least 10% of workouts
    .map(d => d.day);

  // Calculate confidence
  const topHourPercentage = (sortedHours[0]?.count || 0) / workouts.length;
  const confidence: 'high' | 'medium' | 'low' =
    topHourPercentage > 0.5 ? 'high' :
    topHourPercentage > 0.25 ? 'medium' : 'low';

  // Suggest reminder 1-2 hours before typical workout time
  const reminderHour = Math.max(0, preferredHour - 1);
  const suggestedReminderTime = `${reminderHour.toString().padStart(2, '0')}:00`;

  // Generate insights
  const insights: string[] = [];

  if (sortedHours[0]) {
    const period = preferredHour < 12 ? 'morning' : preferredHour < 17 ? 'afternoon' : 'evening';
    insights.push(`You typically work out in the ${period} (${formatHour(preferredHour)})`);
  }

  if (preferredDays.length > 0) {
    const dayNames = preferredDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
    if (preferredDays.length <= 3) {
      insights.push(`Your most active days: ${dayNames.join(', ')}`);
    }
  }

  // Check for consistency
  if (confidence === 'high') {
    insights.push('You have a consistent workout schedule!');
  } else if (confidence === 'low') {
    insights.push('Your workout times vary - we\'ll adapt to your patterns');
  }

  return {
    preferredHour,
    preferredDays: preferredDays.length > 0 ? preferredDays : [1, 2, 3, 4, 5],
    confidence,
    suggestedReminderTime,
    insights,
  };
}

/**
 * Generate personalized notification message based on user context
 */
export function generatePersonalizedMessage(context: {
  name: string;
  streak: number;
  lastWorkoutDaysAgo: number;
  totalWorkouts: number;
  currentHour: number;
  preferredHour?: number;
  closestAchievement?: { name: string; progress: number };
}): { title: string; body: string } {
  const { name, streak, lastWorkoutDaysAgo, totalWorkouts, currentHour, preferredHour, closestAchievement } = context;
  const firstName = name.split(' ')[0];

  // Achievement-focused message
  if (closestAchievement && closestAchievement.progress >= 80) {
    return {
      title: `Almost there, ${firstName}!`,
      body: `You're ${100 - closestAchievement.progress}% away from "${closestAchievement.name}"! One workout could do it.`,
    };
  }

  // Streak-focused messages
  if (streak >= 7 && lastWorkoutDaysAgo === 0) {
    return {
      title: `${streak}-day streak! 🔥`,
      body: `You're on fire, ${firstName}! Keep the momentum going.`,
    };
  }

  if (streak > 0 && lastWorkoutDaysAgo >= 1) {
    const urgency = lastWorkoutDaysAgo >= 1 ? '⚠️ ' : '';
    return {
      title: `${urgency}Don't break your ${streak}-day streak!`,
      body: `Hey ${firstName}, a quick workout keeps your streak alive!`,
    };
  }

  // Time-based messages
  if (preferredHour && Math.abs(currentHour - preferredHour) <= 1) {
    return {
      title: 'Your usual workout time!',
      body: `${firstName}, you typically work out around now. Ready to crush it?`,
    };
  }

  // Milestone messages
  if (totalWorkouts === 99) {
    return {
      title: '1 workout to 100! 🎯',
      body: `${firstName}, your 100th workout awaits. Make it legendary!`,
    };
  }

  // Default encouraging messages based on time of day
  const timeMessages = {
    morning: [
      { title: 'Morning gains await!', body: `Start the day strong, ${firstName}!` },
      { title: 'Rise and lift!', body: 'Early workouts = best workouts' },
    ],
    afternoon: [
      { title: 'Afternoon energy boost', body: `Perfect time for a workout, ${firstName}!` },
      { title: 'Midday motivation', body: 'Take a break and get moving!' },
    ],
    evening: [
      { title: 'Evening workout?', body: `End the day on a high note, ${firstName}!` },
      { title: 'Gym time!', body: 'Crush those goals before bed!' },
    ],
  };

  const period = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
  const messages = timeMessages[period];
  const selected = messages[Math.floor(Math.random() * messages.length)];

  return selected;
}

/**
 * Determine if now is a good time to send a notification
 */
export function shouldSendNotificationNow(context: {
  preferredHour: number;
  preferredDays: number[];
  hasWorkedOutToday: boolean;
  lastNotificationTime?: Date;
}): { shouldSend: boolean; reason: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Don't send if already worked out today
  if (context.hasWorkedOutToday) {
    return { shouldSend: false, reason: 'Already worked out today' };
  }

  // Don't send too early or too late
  if (currentHour < 7 || currentHour > 21) {
    return { shouldSend: false, reason: 'Outside reasonable hours' };
  }

  // Don't send too frequently
  if (context.lastNotificationTime) {
    const hoursSinceLastNotification = (now.getTime() - context.lastNotificationTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastNotification < 4) {
      return { shouldSend: false, reason: 'Too soon since last notification' };
    }
  }

  // Prefer sending on typical workout days
  const isPreferredDay = context.preferredDays.includes(currentDay);

  // Send ~1 hour before preferred time on preferred days
  const isNearPreferredTime = Math.abs(currentHour - (context.preferredHour - 1)) <= 1;

  if (isPreferredDay && isNearPreferredTime) {
    return { shouldSend: true, reason: 'Optimal time based on workout history' };
  }

  // Send at 6pm if no workout today (general reminder)
  if (currentHour >= 18 && currentHour <= 19) {
    return { shouldSend: true, reason: 'Evening reminder - no workout today' };
  }

  return { shouldSend: false, reason: 'Not optimal timing' };
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}
