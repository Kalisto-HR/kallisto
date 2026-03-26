package auth

var HS256Header = Header{
	Alg: "hs256",
	Typ: "jwt",
}

type Claims struct {
	SID              string   `json:"sid,omitempty"`
	UID              string   `json:"uid"`
	FirstName        string   `json:"first_name"`
	LastName         string   `json:"last_name"`
	Role             string   `json:"role"`
	Permissions      []string `json:"permissions,omitempty"`
	UniversityLinked *string  `json:"university_linked,omitempty"`
	Iat              int64    `json:"iat"`
	Exp              int64    `json:"exp"`
}

type Header struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}
