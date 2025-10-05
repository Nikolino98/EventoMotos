-- Create attendees table to store all attendee data
CREATE TABLE public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT,
  row_data JSONB NOT NULL,
  bracelet_number TEXT,
  companion_bracelet_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (no authentication required)
CREATE POLICY "Allow public read access"
ON public.attendees
FOR SELECT
TO anon
USING (true);

-- Create policy to allow public insert access
CREATE POLICY "Allow public insert access"
ON public.attendees
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy to allow public update access
CREATE POLICY "Allow public update access"
ON public.attendees
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Create policy to allow public delete access
CREATE POLICY "Allow public delete access"
ON public.attendees
FOR DELETE
TO anon
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.attendees
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for the attendees table
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;