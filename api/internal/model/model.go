package model

type LookupResponse struct {
	Query       string         `json:"query"`
	QueryType   string         `json:"queryType"`
	Resolver    string         `json:"resolver,omitempty"`
	ResolverIP  string         `json:"resolverIp,omitempty"`
	ResolvedIPs []string       `json:"resolvedIps,omitempty"`
	Results     []LookupResult `json:"results"`
}

type LookupResult struct {
	IP             string `json:"ip"`
	Family         string `json:"family"`
	StartNum       string `json:"startNum,omitempty"`
	EndNum         string `json:"endNum,omitempty"`
	Continent      string `json:"continent,omitempty"`
	Country        string `json:"country,omitempty"`
	Province       string `json:"province,omitempty"`
	City           string `json:"city,omitempty"`
	District       string `json:"district,omitempty"`
	ISP            string `json:"isp,omitempty"`
	Longitude      string `json:"longitude,omitempty"`
	Latitude       string `json:"latitude,omitempty"`
	AreaCode       string `json:"areaCode,omitempty"`
	CityCode       string `json:"cityCode,omitempty"`
	ZipCode        string `json:"zipCode,omitempty"`
	TimeZone       string `json:"timeZone,omitempty"`
	Currency       string `json:"currency,omitempty"`
	ASN            string `json:"asn,omitempty"`
	Elevation      string `json:"elevation,omitempty"`
	WeatherStation string `json:"weatherStation,omitempty"`
	CountryChar    string `json:"countryChar,omitempty"`
	ISOCode        string `json:"isoCode,omitempty"`
	Flag           string `json:"flag,omitempty"`
}

type MetaResponse struct {
	Service       string   `json:"service"`
	PublicBaseURL string   `json:"publicBaseUrl"`
	UpdateEnabled bool     `json:"updateEnabled"`
	Databases     []DBMeta `json:"databases"`
}

type DBMeta struct {
	Family      string `json:"family"`
	Path        string `json:"path"`
	CreatedAt   int64  `json:"createdAt"`
	CreatedDate string `json:"createdDate"`
}

type UpdateResponse struct {
	Updated bool           `json:"updated"`
	Message string         `json:"message"`
	Items   []UpdateResult `json:"items"`
}

type UpdateResult struct {
	Family         string `json:"family"`
	Updated        bool   `json:"updated"`
	LocalCreatedAt int64  `json:"localCreatedAt"`
	RemoteReleased int64  `json:"remoteReleasedAt"`
	DownloadedTo   string `json:"downloadedTo,omitempty"`
	Message        string `json:"message"`
}
