export function createEventSource(url: string): EventSource {
  const eventSource = new EventSource(url);
  
  eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
  };
  
  return eventSource;
}

export function parseEventData(event: MessageEvent): any {
  try {
    return JSON.parse(event.data);
  } catch (error) {
    console.error('Failed to parse event data:', error);
    return null;
  }
}