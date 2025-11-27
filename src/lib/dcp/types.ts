export type DcpControlChunk = {
  heading: string; // e.g. "2.3.1 Secondary Dwellings"
  body: string; // extracted text
};

export type DcpParseResult = {
  instrumentName: string; // e.g. "Kempsey DCP 2013"
  lgaName?: string | null;
  sections: DcpControlChunk[];
};
