package model

type LookupResponse struct {
	Query       string         `json:"query"`
	QueryType   string         `json:"queryType"`
	ResolvedIPs []string       `json:"resolvedIps,omitempty"`
	Results     []LookupResult `json:"results"`
}

type LookupResult struct {
	IP             string `json:"ip"`
	Family         string `json:"family"`
	StartNum       string `json:"startNum"`
	EndNum         string `json:"endNum"`
	Continent      string `json:"continent"`
	Country        string `json:"country"`
	Province       string `json:"province"`
	City           string `json:"city"`
	District       string `json:"district"`
	ISP            string `json:"isp"`
	Longitude      string `json:"longitude"`
	Latitude       string `json:"latitude"`
	AreaCode       string `json:"areaCode"`
	CityCode       string `json:"cityCode"`
	ZipCode        string `json:"zipCode"`
	TimeZone       string `json:"timeZone"`
	Currency       string `json:"currency"`
	ASN            string `json:"asn"`
	Elevation      string `json:"elevation"`
	WeatherStation string `json:"weatherStation"`
	CountryChar    string `json:"countryChar"`
	ISOCode        string `json:"isoCode"`
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
