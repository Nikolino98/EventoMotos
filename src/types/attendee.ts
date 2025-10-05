export interface Attendee {
  id: string;
  braceletNumber?: string;
  companionBraceletNumber?: string;
  isConfirmed?: boolean;
  [key: string]: any;
}
