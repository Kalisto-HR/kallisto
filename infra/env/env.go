package env

import (
    "bufio"
    "os"
    "strings"
)

func LoadEnv(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }

    defer file.Close()
    scanner := bufio.NewScanner(file)

    for scanner.Scan() {
        line := strings.TrimSpace(scanner.Text())
        if line == "" || strings.HasPrefix(line, "#") {
            continue
        }
        parts := strings.SplitN(line, "=", 2)
        if len(parts) != 2 {
            continue
        }
        key := strings.TrimSpace(parts[0])
        val := strings.TrimSpace(parts[1])

        err = os.Setenv(key, val)

		if err != nil {
			// FUTURE LOG INFO
		}
    }

    return scanner.Err()
}
