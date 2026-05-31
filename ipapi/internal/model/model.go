package model

type LookupResponse struct {
	Query       string         `json:"query"`
	QueryType   string         `json:"queryType"`
	ResolvedIPs []string       `json:"resolvedIps,omitempty"`
	Results     []LookupResult `json:"results"`
}

type LookupResult struct {
	IP            string  `json:"ip"`
	Family        string  `json:"family"`
	Continent     string  `json:"continent,omitempty"`
	ContinentCode string  `json:"continentCode,omitempty"`
	Country       string  `json:"country,omitempty"`
	CountryCode   string  `json:"countryCode,omitempty"`
	RegionCode    string  `json:"regionCode,omitempty"`
	Province      string  `json:"province,omitempty"`
	City          string  `json:"city,omitempty"`
	District      string  `json:"district,omitempty"`
	ZipCode       string  `json:"zipCode,omitempty"`
	Latitude      float64 `json:"latitude,omitempty"`
	Longitude     float64 `json:"longitude,omitempty"`
	TimeZone      string  `json:"timeZone,omitempty"`
	Currency      string  `json:"currency,omitempty"`
	Offset        int     `json:"offset,omitempty"`
	ISP           string  `json:"isp,omitempty"`
	Org           string  `json:"org,omitempty"`
	ASN           string  `json:"asn,omitempty"`
	ASName        string  `json:"asName,omitempty"`
	Reverse       string  `json:"reverse,omitempty"`
	Mobile        bool    `json:"mobile"`
	Proxy         bool    `json:"proxy"`
	Hosting       bool    `json:"hosting"`
}

type GeoIPResponse struct {
	IP            string  `json:"ip"`
	Family        string  `json:"family"`
	Continent     string  `json:"continent,omitempty"`
	ContinentCode string  `json:"continent_code,omitempty"`
	Country       string  `json:"country,omitempty"`
	CountryCode   string  `json:"country_code,omitempty"`
	Region        string  `json:"region,omitempty"`
	RegionCode    string  `json:"region_code,omitempty"`
	City          string  `json:"city,omitempty"`
	District      string  `json:"district,omitempty"`
	PostalCode    string  `json:"postal_code,omitempty"`
	Latitude      float64 `json:"latitude,omitempty"`
	Longitude     float64 `json:"longitude,omitempty"`
	TimeZone      string  `json:"timezone,omitempty"`
	Currency      string  `json:"currency,omitempty"`
	Offset        int     `json:"offset,omitempty"`
	ASN           string  `json:"asn,omitempty"`
	ISP           string  `json:"isp,omitempty"`
	Org           string  `json:"org,omitempty"`
	ASName        string  `json:"asname,omitempty"`
	Reverse       string  `json:"reverse,omitempty"`
	Mobile        bool    `json:"mobile"`
	Proxy         bool    `json:"proxy"`
	Hosting       bool    `json:"hosting"`
}

type MetaResponse struct {
	Service       string   `json:"service"`
	PublicBaseURL string   `json:"publicBaseUrl"`
	Provider      string   `json:"provider"`
	AllowedOrigin []string `json:"allowedOrigins"`
}
