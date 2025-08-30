package auth

var HS256Header = Header{
	Alg: "hs256",
	Typ: "jwt",
}

type Claims struct {
	UID  string `json:"uid"`
	Role string `json:"role"`
	Iat  int64  `json:"iat"`
}

type Header struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}
