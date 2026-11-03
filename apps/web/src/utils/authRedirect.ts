/**
 * Helper xác định đường dẫn điều hướng an toàn dựa theo vai trò (Role-based Redirect)
 * Đảm bảo:
 * - Chống lỗ hổng Open Redirect (bảo đảm đường dẫn chỉ bắt đầu bằng 1 dấu '/', không phải '//' hoặc '/\')
 * - ADMIN chỉ được điều hướng vào /admin hoặc các trang con /admin/*
 * - TEACHER chỉ được điều hướng vào /lecturer/dashboard hoặc các trang con /lecturer/*
 * - STUDENT không bao giờ bị nhảy vào /admin hay /lecturer
 */
export const getRoleRedirectTarget = (
  role?: string,
  redirectParam?: string | null,
): string => {
  const isSafeRelativeUrl =
    typeof redirectParam === 'string' &&
    redirectParam.startsWith('/') &&
    !redirectParam.startsWith('//') &&
    !redirectParam.startsWith('/\\');

  const cleanRedirect = isSafeRelativeUrl ? redirectParam.trim() : null;

  if (role === 'ADMIN') {
    if (cleanRedirect && cleanRedirect.startsWith('/admin')) {
      return cleanRedirect;
    }
    return '/admin';
  }

  if (role === 'TEACHER') {
    if (
      cleanRedirect &&
      (cleanRedirect.startsWith('/lecturer') || cleanRedirect.startsWith('/teacher'))
    ) {
      return cleanRedirect;
    }
    return '/lecturer/dashboard';
  }

  // STUDENT hoặc người dùng thông thường
  if (
    cleanRedirect &&
    !cleanRedirect.startsWith('/admin') &&
    !cleanRedirect.startsWith('/lecturer') &&
    !cleanRedirect.startsWith('/teacher')
  ) {
    return cleanRedirect;
  }

  return '/';
};
