using System.Security.Cryptography;

namespace ProyectoTransportesManaAPI.Helpers
{
    public static class PasswordHasher
    {
        // Formato almacenado: Base64Salt:Base64Hash
        public static bool VerifyPassword(string passwordInput, string storedHash)
        {
            try
            {
                var partes = storedHash.Split(':');
                if (partes.Length != 2)
                    return false;

                var salt = Convert.FromBase64String(partes[0]);
                var hashCorrecto = Convert.FromBase64String(partes[1]);

                var hashPrueba = Rfc2898DeriveBytes.Pbkdf2(
                    passwordInput,
                    salt,
                    310_000,
                    HashAlgorithmName.SHA256,
                    32
                );

                return CryptographicOperations.FixedTimeEquals(hashCorrecto, hashPrueba);
            }
            catch
            {
                return false;
            }
        }

        public static string HashPassword(string password)
        {
            byte[] salt = RandomNumberGenerator.GetBytes(16);

            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                310_000,
                HashAlgorithmName.SHA256,
                32
            );

            return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
        }
    }
}